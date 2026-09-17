import axios from 'axios'
import retry from 'retry'
import { z } from 'zod'

const openDotaMatchResponseSchema = z.object({
  dire_score: z.number().nullish(),
  lobby_type: z.number().nullish(),
  players: z
    .array(
      z.object({
        assists: z.number().nullish(),
        deaths: z.number().nullish(),
        hero_id: z.number(),
        kills: z.number().nullish(),
      }),
    )
    .nullish(),
  radiant_score: z.number().nullish(),
  radiant_win: z.boolean().nullish(),
})

const parseJobResponseSchema = z.object({
  job: z
    .object({
      jobId: z.number().optional(),
    })
    .nullish(),
})

const parseJobStatusResponseSchema = z.object({
  status: z.string().nullish(),
})

// Define a proper type for match data
interface MatchData {
  matchId: string
  radiantWin: boolean | null
  lobbyType: number | null
  radiantScore: number
  direScore: number
  kills: number
  deaths: number
  assists: number
}

interface OpenDotaPlayer {
  assists?: number | null
  deaths?: number | null
  hero_id: number
  kills?: number | null
}

interface ParsedOpenDotaMatch {
  dire_score?: number | null
  lobby_type?: number | null
  players: OpenDotaPlayer[]
  radiant_score?: number | null
  radiant_win?: boolean | null
}

const REQUEST_TIMEOUT_MS = 15 * 1000
const PARSE_RETRY_WINDOW_MS = 2 * 60 * 1000

const parsedMatchCache = new Map<string, ParsedOpenDotaMatch>()
const matchRequestCache = new Map<string, Promise<ParsedOpenDotaMatch>>()
const jobRequestCache = new Map<string, Promise<number>>()
const jobStatusCache = new Map<number, Promise<boolean>>()

const compactMatch = function compactMatch(
  match: z.infer<typeof openDotaMatchResponseSchema>,
): ParsedOpenDotaMatch {
  return {
    dire_score: match.dire_score,
    lobby_type: match.lobby_type,
    players: (match.players ?? []).map((player) => ({
      assists: player.assists,
      deaths: player.deaths,
      hero_id: player.hero_id,
      kills: player.kills,
    })),
    radiant_score: match.radiant_score,
    radiant_win: match.radiant_win,
  }
}

const createJob = async function createJob(matchId: string): Promise<number> {
  // Check if we already have a job request in progress for this match
  if (jobRequestCache.has(matchId)) {
    console.log(`[MMR] Using existing job request for matchId: ${matchId}`)
    const cachedJob = jobRequestCache.get(matchId)
    if (!cachedJob) {
      throw new Error(`Job request for match ${matchId} was in cache but returned undefined`)
    }
    return await cachedJob
  }

  // Set up the retry operation
  const operation = retry.operation({
    // Exponential backoff factor
    factor: 3,
    maxRetryTime: PARSE_RETRY_WINDOW_MS,
    // Maximum retry timeout (60 seconds)
    maxTimeout: 60 * 1000,
    // Minimum retry timeout (1 second)
    minTimeout: 1 * 1000,
    // Number of retries
    retries: 8,
  })

  // oxlint-disable-next-line promise/avoid-new -- retry exposes a callback lifecycle that needs a promise bridge.
  const jobPromise = new Promise<number>((resolve, reject) => {
    const attemptJobRequest = async () => {
      try {
        const createdJobResponse = await axios.post<unknown>(
          `https://api.opendota.com/api/request/${matchId}`,
          undefined,
          {
            timeout: REQUEST_TIMEOUT_MS,
          },
        )
        const createdJob = parseJobResponseSchema.parse(createdJobResponse.data)

        const jobId = createdJob.job?.jobId
        if (jobId === undefined) {
          if (operation.retry(new Error('Match not ready to be parsed'))) {
            return
          }

          // Remove from cache if failed
          jobRequestCache.delete(matchId)
          reject(new Error('Match not ready to be parsed'))
          return
        }

        // Continue once parsing is complete
        resolve(jobId)
      } catch (error) {
        // All this because opendota responds with e400 if not ready
        if (operation.retry(new Error('Match not ready to be parsed'))) {
          return
        }

        // Remove from cache if failed
        jobRequestCache.delete(matchId)
        reject(error)
      }
    }

    operation.attempt(() => {
      void attemptJobRequest()
    })
  })

  // Store the promise in the cache
  jobRequestCache.set(matchId, jobPromise)

  const scheduleCacheCleanup = () => {
    // Keep successful results in cache for a while, but eventually clean them up
    setTimeout(
      () => {
        jobRequestCache.delete(matchId)
      },
      5 * 60 * 1000,
      // 5 minutes
    )
  }

  try {
    return await jobPromise
  } finally {
    scheduleCacheCleanup()
  }
}

const getJobStatus = async function getJobStatus(jobId: number): Promise<boolean> {
  // Check if we already have a job status check in progress
  if (jobStatusCache.has(jobId)) {
    console.log(`[MMR] Using existing job status check for jobId: ${jobId}`)
    const cachedStatus = jobStatusCache.get(jobId)
    if (!cachedStatus) {
      throw new Error(`Job status for job ${jobId} was in cache but returned undefined`)
    }
    return await cachedStatus
  }

  // Set up the retry operation
  const operation = retry.operation({
    // Exponential backoff factor
    factor: 3,
    maxRetryTime: PARSE_RETRY_WINDOW_MS,
    // Maximum retry timeout (60 seconds)
    maxTimeout: 60 * 1000,
    // Minimum retry timeout (2 seconds)
    minTimeout: 1 * 2000,
    // Number of retries
    retries: 8,
  })

  // oxlint-disable-next-line promise/avoid-new -- retry exposes a callback lifecycle that needs a promise bridge.
  const statusPromise = new Promise<boolean>((resolve, reject) => {
    const attemptStatusRequest = async () => {
      try {
        const jobStatusResponse = await axios.get<unknown>(
          `https://api.opendota.com/api/request/${jobId}`,
          {
            timeout: REQUEST_TIMEOUT_MS,
          },
        )
        const jobStatus = parseJobStatusResponseSchema.parse(jobStatusResponse.data)

        // According to OpenDota API, we need to check the status field
        if (jobStatus.status === 'completed') {
          resolve(true)
          return
        }

        // If job is still in progress or queued
        if (jobStatus.status === 'processing' || jobStatus.status === 'queued') {
          if (operation.retry(new Error('Job still in progress'))) {
            return
          }
        }

        // Remove from cache if failed or unknown status
        jobStatusCache.delete(jobId)
        reject(new Error(`Job not finished or has unexpected status: ${jobStatus.status}`))
      } catch (error) {
        if (operation.retry(new Error('Error checking job status'))) {
          return
        }

        // Remove from cache if failed
        jobStatusCache.delete(jobId)
        reject(error)
      }
    }

    operation.attempt(() => {
      void attemptStatusRequest()
    })
  })

  // Store the promise in the cache
  jobStatusCache.set(jobId, statusPromise)

  const scheduleCacheCleanup = () => {
    // Keep successful results in cache for a while, but eventually clean them up
    setTimeout(
      () => {
        jobStatusCache.delete(jobId)
      },
      5 * 60 * 1000,
      // 5 minutes
    )
  }

  try {
    return await statusPromise
  } finally {
    scheduleCacheCleanup()
  }
}

const fetchOpenDotaMatch = async function fetchOpenDotaMatch(
  matchId: string,
): Promise<ParsedOpenDotaMatch> {
  const matchUrl = `https://api.opendota.com/api/matches/${matchId}`
  const initialResponse = await axios.get<unknown>(matchUrl, {
    timeout: REQUEST_TIMEOUT_MS,
  })
  const initialMatch = openDotaMatchResponseSchema.parse(initialResponse.data)

  if (Array.isArray(initialMatch.players)) {
    return compactMatch(initialMatch)
  }

  console.log(`[MMR] Match ${matchId} data incomplete, attempting to request parsing`)

  try {
    const jobId = await createJob(matchId)
    await getJobStatus(jobId)
    const parsedResponse = await axios.get<unknown>(matchUrl, {
      timeout: REQUEST_TIMEOUT_MS,
    })
    const parsedMatch = openDotaMatchResponseSchema.parse(parsedResponse.data)

    if (!Array.isArray(parsedMatch.players)) {
      throw new TypeError(`Match ${matchId} is still incomplete after parsing completed`)
    }

    return compactMatch(parsedMatch)
  } catch (error) {
    console.error(`[MMR] Failed to parse match ${matchId}:`, error)
    throw new Error(`Match ${matchId} not available or not ready to be parsed`, {
      cause: error,
    })
  }
}

const getOpenDotaMatch = async function getOpenDotaMatch(
  matchId: string,
): Promise<ParsedOpenDotaMatch> {
  const cachedMatch = parsedMatchCache.get(matchId)
  if (cachedMatch) {
    return cachedMatch
  }

  const pendingRequest = matchRequestCache.get(matchId)
  if (pendingRequest) {
    console.log(`[MMR] Using existing match request for matchId: ${matchId}`)
    return await pendingRequest
  }

  const request = fetchOpenDotaMatch(matchId)
  matchRequestCache.set(matchId, request)

  try {
    const match = await request
    parsedMatchCache.set(matchId, match)
    return match
  } finally {
    if (matchRequestCache.get(matchId) === request) {
      matchRequestCache.delete(matchId)
    }
  }
}

export const getMatchData = async function getMatchData(
  matchId: string,
  heroId: number,
): Promise<MatchData> {
  try {
    const opendotaMatch = await getOpenDotaMatch(matchId)
    const hasRadiantResult =
      opendotaMatch.radiant_win !== undefined && opendotaMatch.radiant_win !== null
    const moreData = {
      assists: 0,
      deaths: 0,
      direScore: hasRadiantResult ? (opendotaMatch.dire_score ?? 0) : 0,
      kills: 0,
      radiantScore: hasRadiantResult ? (opendotaMatch.radiant_score ?? 0) : 0,
    }

    if (heroId !== 0) {
      const matchedPlayer = opendotaMatch.players.find((candidate) => candidate.hero_id === heroId)
      if (matchedPlayer) {
        moreData.kills = matchedPlayer.kills ?? 0
        moreData.deaths = matchedPlayer.deaths ?? 0
        moreData.assists = matchedPlayer.assists ?? 0
      }
    }

    return {
      lobbyType: opendotaMatch.lobby_type ?? null,
      matchId,
      radiantWin: opendotaMatch.radiant_win ?? null,
      ...moreData,
    }
  } catch (error) {
    console.error(`[MMR] Error fetching match ${matchId}:`, error)
    throw new Error(`Failed to fetch match data for ${matchId}`, { cause: error })
  }
}
