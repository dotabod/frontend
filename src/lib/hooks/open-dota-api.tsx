import axios from 'axios'
import retry from 'retry'

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
  assists?: number
  deaths?: number
  hero_id: number
  kills?: number
}

interface OpenDotaMatch {
  dire_score?: number
  lobby_type?: number
  players?: OpenDotaPlayer[]
  radiant_score?: number
  radiant_win?: boolean
}

const REQUEST_TIMEOUT_MS = 15 * 1000
const PARSE_RETRY_WINDOW_MS = 2 * 60 * 1000

const parsedMatchCache = new Map<string, OpenDotaMatch>()
const matchRequestCache = new Map<string, Promise<OpenDotaMatch>>()
const jobRequestCache = new Map<string, Promise<number>>()
const jobStatusCache = new Map<number, Promise<boolean>>()

export const getMatchData = async function getMatchData(
  matchId: string,
  heroId: number,
): Promise<MatchData> {
  try {
    const opendotaMatch = await getOpenDotaMatch(matchId)

    let radiantWin = null
    let lobbyType = null
    const moreData = {
      assists: 0,
      deaths: 0,
      direScore: 0,
      kills: 0,
      radiantScore: 0,
    }

    if (Array.isArray(opendotaMatch.players)) {
      if (typeof opendotaMatch.radiant_win === 'boolean') {
        radiantWin = opendotaMatch.radiant_win
        moreData.radiantScore = opendotaMatch.radiant_score ?? 0
        moreData.direScore = opendotaMatch.dire_score ?? 0
      }

      // Extract player-specific stats if heroId is provided
      if (heroId) {
        const player = opendotaMatch.players.find((player) => player.hero_id === heroId)
        if (player) {
          moreData.kills = player.kills ?? 0
          moreData.deaths = player.deaths ?? 0
          moreData.assists = player.assists ?? 0
        }
      }

      if (typeof opendotaMatch.lobby_type === 'number') {
        lobbyType = opendotaMatch.lobby_type
      }
    } else {
      throw new TypeError('Match data is incomplete')
    }

    const result = {
      lobbyType,
      matchId,
      radiantWin,
      ...moreData,
    }

    return result
  } catch (error) {
    console.error(`[MMR] Error fetching match ${matchId}:`, error)
    throw new Error(`Failed to fetch match data for ${matchId}`, { cause: error })
  }
}

const getOpenDotaMatch = async function getOpenDotaMatch(matchId: string): Promise<OpenDotaMatch> {
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

const fetchOpenDotaMatch = async function fetchOpenDotaMatch(
  matchId: string,
): Promise<OpenDotaMatch> {
  const matchUrl = `https://api.opendota.com/api/matches/${matchId}`
  const initialMatch = await axios(matchUrl, { timeout: REQUEST_TIMEOUT_MS })

  if (Array.isArray(initialMatch.data?.players)) {
    return compactMatch(initialMatch.data)
  }

  console.log(`[MMR] Match ${matchId} data incomplete, attempting to request parsing`)

  try {
    const jobId = await createJob(matchId)
    await getJobStatus(jobId)
    const parsedMatch = await axios(matchUrl, { timeout: REQUEST_TIMEOUT_MS })

    if (!Array.isArray(parsedMatch.data?.players)) {
      throw new TypeError(`Match ${matchId} is still incomplete after parsing completed`)
    }

    return compactMatch(parsedMatch.data)
  } catch (error) {
    console.error(`[MMR] Failed to parse match ${matchId}:`, error)
    throw new Error(`Match ${matchId} not available or not ready to be parsed`, {
      cause: error,
    })
  }
}

const compactMatch = function compactMatch(match: OpenDotaMatch): OpenDotaMatch {
  return {
    dire_score: match.dire_score,
    lobby_type: match.lobby_type,
    players: match.players?.map((player) => ({
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
    // Maximum retry timeout (60 seconds)
    maxTimeout: 60 * 1000,
    maxRetryTime: PARSE_RETRY_WINDOW_MS,
    // Minimum retry timeout (1 second)
    minTimeout: 1 * 1000,
    // Number of retries
    retries: 8,
  })

  const jobPromise = new Promise<number>((resolve, reject) => {
    operation.attempt(async () => {
      try {
        const createdJob = await axios.post(
          `https://api.opendota.com/api/request/${matchId}`,
          undefined,
          {
            timeout: REQUEST_TIMEOUT_MS,
          },
        )

        const jobId = createdJob.data?.job?.jobId
        if (typeof jobId !== 'number') {
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

  // Handle both outcomes so a rejected job does not create another rejected promise.
  void jobPromise.then(scheduleCacheCleanup, scheduleCacheCleanup)

  return await jobPromise
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
    // Maximum retry timeout (60 seconds)
    maxTimeout: 60 * 1000,
    maxRetryTime: PARSE_RETRY_WINDOW_MS,
    // Minimum retry timeout (2 seconds)
    minTimeout: 1 * 2000,
    // Number of retries
    retries: 8,
  })

  const statusPromise = new Promise<boolean>((resolve, reject) => {
    operation.attempt(async () => {
      try {
        const jobStatus = await axios.get(`https://api.opendota.com/api/request/${jobId}`, {
          timeout: REQUEST_TIMEOUT_MS,
        })

        // According to OpenDota API, we need to check the status field
        if (jobStatus?.data?.status === 'completed') {
          resolve(true)
          return
        }

        // If job is still in progress or queued
        if (jobStatus?.data?.status === 'processing' || jobStatus?.data?.status === 'queued') {
          if (operation.retry(new Error('Job still in progress'))) {
            return
          }
        }

        // Remove from cache if failed or unknown status
        jobStatusCache.delete(jobId)
        reject(new Error(`Job not finished or has unexpected status: ${jobStatus?.data?.status}`))
      } catch (error) {
        if (operation.retry(new Error('Error checking job status'))) {
          return
        }

        // Remove from cache if failed
        jobStatusCache.delete(jobId)
        reject(error)
      }
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

  // Handle both outcomes so a rejected status check does not create another rejected promise.
  void statusPromise.then(scheduleCacheCleanup, scheduleCacheCleanup)

  return await statusPromise
}
