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

// Cache for match data and job requests
export const matchDataCache = new Map<string, MatchData>()
const jobRequestCache = new Map<string, Promise<number>>()
const jobStatusCache = new Map<number, Promise<boolean>>()

export async function getMatchData(matchId: string, heroId: number) {
  // Check if we already have this match data cached
  if (matchDataCache.has(matchId)) {
    console.log(`[MMR] Using cached match data for matchId: ${matchId}`)
    return matchDataCache.get(matchId)
  }

  try {
    const opendotaMatch = await axios(`https://api.opendota.com/api/matches/${matchId}`)

    // If the match data is incomplete, we might need to request parsing
    if (!opendotaMatch.data || !opendotaMatch.data.players) {
      console.log(`[MMR] Match ${matchId} data incomplete, attempting to request parsing`)
      try {
        const jobId = await createJob(matchId)
        await getJobStatus(jobId)
        // After job completes, try fetching the match data again
        return getMatchData(matchId, heroId)
      } catch (error) {
        console.error(`[MMR] Failed to parse match ${matchId}:`, error)
        throw new Error(`Match ${matchId} not available or not ready to be parsed`)
      }
    }

    let radiantWin = null
    let lobbyType = null
    const moreData = {
      radiantScore: 0,
      direScore: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
    }

    if (Array.isArray(opendotaMatch.data?.players)) {
      if (typeof opendotaMatch?.data?.radiant_win === 'boolean') {
        radiantWin = opendotaMatch?.data?.radiant_win
        moreData.radiantScore = opendotaMatch?.data?.radiant_score || 0
        moreData.direScore = opendotaMatch?.data?.dire_score || 0
      }

      // Extract player-specific stats if heroId is provided
      if (heroId) {
        const player = opendotaMatch.data.players.find((p) => p.hero_id === heroId)
        if (player) {
          moreData.kills = player.kills || 0
          moreData.deaths = player.deaths || 0
          moreData.assists = player.assists || 0
        }
      }

      if (typeof opendotaMatch?.data?.lobby_type === 'number') {
        lobbyType = opendotaMatch?.data?.lobby_type
      }
    } else {
      throw new Error('Match data is incomplete')
    }

    const result = {
      matchId,
      radiantWin,
      lobbyType,
      ...moreData,
    }

    // Cache the result
    matchDataCache.set(matchId, result)

    return result
  } catch (error) {
    console.error(`[MMR] Error fetching match ${matchId}:`, error)
    throw new Error(`Failed to fetch match data for ${matchId}`)
  }
}

export async function createJob(matchId: string): Promise<number> {
  // Check if we already have a job request in progress for this match
  if (jobRequestCache.has(matchId)) {
    console.log(`[MMR] Using existing job request for matchId: ${matchId}`)
    const cachedJob = jobRequestCache.get(matchId)
    if (!cachedJob) {
      throw new Error(`Job request for match ${matchId} was in cache but returned undefined`)
    }
    return cachedJob
  }

  // Set up the retry operation
  const operation = retry.operation({
    retries: 8, // Number of retries
    factor: 3, // Exponential backoff factor
    minTimeout: 1 * 1000, // Minimum retry timeout (1 second)
    maxTimeout: 60 * 1000, // Maximum retry timeout (60 seconds)
  })

  const jobPromise = new Promise<number>((resolve, reject) => {
    operation.attempt(async () => {
      try {
        const createdJob = await axios.post(`https://api.opendota.com/api/request/${matchId}`)

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
      } catch (e) {
        // all this because opendota responds with e400 if not ready
        if (operation.retry(new Error('Match not ready to be parsed'))) {
          return
        }

        // Remove from cache if failed
        jobRequestCache.delete(matchId)
        reject(e)
      }
    })
  })

  // Store the promise in the cache
  jobRequestCache.set(matchId, jobPromise)

  // Clean up cache after promise resolves or rejects
  jobPromise.finally(() => {
    // Keep successful results in cache for a while, but eventually clean them up
    setTimeout(
      () => {
        jobRequestCache.delete(matchId)
      },
      5 * 60 * 1000,
    ) // 5 minutes
  })

  return jobPromise
}

export async function getJobStatus(jobId: number): Promise<boolean> {
  // Check if we already have a job status check in progress
  if (jobStatusCache.has(jobId)) {
    console.log(`[MMR] Using existing job status check for jobId: ${jobId}`)
    const cachedStatus = jobStatusCache.get(jobId)
    if (!cachedStatus) {
      throw new Error(`Job status for job ${jobId} was in cache but returned undefined`)
    }
    return cachedStatus
  }

  // Set up the retry operation
  const operation = retry.operation({
    retries: 8, // Number of retries
    factor: 3, // Exponential backoff factor
    minTimeout: 1 * 2000, // Minimum retry timeout (2 seconds)
    maxTimeout: 60 * 1000, // Maximum retry timeout (60 seconds)
  })

  const statusPromise = new Promise<boolean>((resolve, reject) => {
    operation.attempt(async () => {
      try {
        const jobStatus = await axios.get(`https://api.opendota.com/api/request/${jobId}`)

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
      } catch (e) {
        if (operation.retry(new Error('Error checking job status'))) {
          return
        }

        // Remove from cache if failed
        jobStatusCache.delete(jobId)
        reject(e)
      }
    })
  })

  // Store the promise in the cache
  jobStatusCache.set(jobId, statusPromise)

  // Clean up cache after promise resolves or rejects
  statusPromise.finally(() => {
    // Keep successful results in cache for a while, but eventually clean them up
    setTimeout(
      () => {
        jobStatusCache.delete(jobId)
      },
      5 * 60 * 1000,
    ) // 5 minutes
  })

  return statusPromise
}

// Add a function to clear cache for a specific match or all matches
export function clearMatchCache(matchId?: string) {
  if (matchId) {
    matchDataCache.delete(matchId)
    jobRequestCache.delete(matchId)
  } else {
    matchDataCache.clear()
    jobRequestCache.clear()
    jobStatusCache.clear()
  }
}
