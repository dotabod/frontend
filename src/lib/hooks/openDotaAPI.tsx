import axios from 'axios'
import retry from 'retry'

export async function getMatchData(matchId: string, heroSlot: number) {
  let isParty = false
  let isPrivate = false

  // Set up the retry operation
  const operation = retry.operation({
    retries: 8, // Number of retries
    factor: 3, // Exponential backoff factor
    minTimeout: 1 * 1000, // Minimum retry timeout (1 second)
    maxTimeout: 60 * 1000, // Maximum retry timeout (60 seconds)
  })

  return new Promise((resolve, reject) => {
    operation.attempt(async () => {
      try {
        const opendotaMatch = await axios(
          `https://api.opendota.com/api/matches/${matchId}`
        )

        if (
          Array.isArray(opendotaMatch.data?.players) &&
          typeof heroSlot === 'number'
        ) {
          isPrivate = !opendotaMatch.data?.players[heroSlot]?.account_id

          const partySize = opendotaMatch.data?.players[heroSlot]?.party_size
          if (typeof partySize === 'number' && partySize > 1) {
            isParty = true
          }
        } else {
          if (operation.retry(new Error('Match not found'))) {
            return
          }

          reject(new Error('Match not found'))
        }

        resolve({ matchId, isParty, isPrivate })
      } catch (e) {
        if (operation.retry(new Error('Match not found'))) {
          return
        }

        reject(e)
      }
    })
  })
}

export async function createJob(matchId: string): Promise<number> {
  // Set up the retry operation
  const operation = retry.operation({
    retries: 8, // Number of retries
    factor: 3, // Exponential backoff factor
    minTimeout: 1 * 1000, // Minimum retry timeout (1 second)
    maxTimeout: 60 * 1000, // Maximum retry timeout (60 seconds)
  })

  return new Promise((resolve, reject) => {
    operation.attempt(async () => {
      try {
        const createdJob = await axios.post(
          `https://api.opendota.com/api/request/${matchId}`
        )

        const jobId = createdJob.data?.job?.jobId
        if (typeof jobId !== 'number') {
          if (operation.retry(new Error('Match not ready to be parsed'))) {
            return
          }

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

        reject(e)
      }
    })
  })
}

export async function getJobStatus(jobId: number): Promise<boolean> {
  // Set up the retry operation
  const operation = retry.operation({
    retries: 8, // Number of retries
    factor: 3, // Exponential backoff factor
    minTimeout: 1 * 2000, // Minimum retry timeout (1 second)
    maxTimeout: 60 * 1000, // Maximum retry timeout (60 seconds)
  })

  return new Promise((resolve, reject) => {
    operation.attempt(async () => {
      try {
        const jobStatus = await axios.get(
          `https://api.opendota.com/api/request/${jobId}`
        )

        if (jobStatus?.data?.type === 'parse') {
          if (operation.retry(new Error('Job not finished'))) {
            return
          }

          reject(new Error('Job not finished'))
          return
        }

        resolve(true)
      } catch (e) {
        if (operation.retry(new Error('Job not finished'))) {
          return
        }

        reject(e)
      }
    })
  })
}
