import axios from 'axios'
import retry from 'retry'

export async function getMatchData(matchId: string, heroId: number) {
  let isParty = false
  let isPrivate = false
  let radiantWin = null
  let lobbyType = null
  const opendotaMatch = await axios(
    `https://api.opendota.com/api/matches/${matchId}`
  )

  const moreData = {
    radiantScore: 0,
    direScore: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
  }

  if (
    Array.isArray(opendotaMatch.data?.players) &&
    typeof heroId === 'number'
  ) {
    const player = opendotaMatch?.data?.players.find(
      (p) => p.hero_id === heroId
    )
    isPrivate = !player?.account_id
    const partySize = player?.party_size
    if (typeof partySize === 'number' && partySize > 1) {
      isParty = true
    }

    if (typeof opendotaMatch?.data?.radiant_win === 'boolean') {
      radiantWin = opendotaMatch?.data?.radiant_win
      moreData.radiantScore = opendotaMatch?.data?.radiant_score
      moreData.direScore = opendotaMatch?.data?.dire_score
      moreData.kills = opendotaMatch?.data?.kills
      moreData.deaths = opendotaMatch?.data?.deaths
      moreData.assists = opendotaMatch?.data?.assists
    }

    if (typeof opendotaMatch?.data?.lobby_type === 'number') {
      lobbyType = opendotaMatch?.data?.lobby_type
    }
  } else {
    new Error('Match not found')
  }

  return {
    matchId,
    isParty,
    isPrivate,
    radiantWin,
    lobbyType,
    ...moreData,
  }
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
