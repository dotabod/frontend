import type { NextApiRequest, NextApiResponse } from 'next'

import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

function convertSteam32To64(steam32Id) {
  return BigInt(steam32Id) + BigInt(76561197960265728)
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(500).end()
  }

  if (req.method !== 'GET') {
    return res.status(500).end()
  }

  const steamIds = req.query.ids

  try {
    // Fetch the XML data for the user's Steam profile
    const response = await fetch(
      `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${
        process.env.STEAM_WEB_API
      }&steamids=${
        !Array.isArray(steamIds)
          ? steamIds
          : steamIds.map(convertSteam32To64).join(',')
      }}`
    )

    const json = await response.json()
    // return an array of avatars for each steam id from the input

    return res.status(200).json({
      data:
        json?.response?.players.map((player) => ({
          avatar: player.avatarfull,
          name: player.personaname,
          id: `${BigInt(player.steamid) - BigInt(76561197960265728)}`,
        })) || [],
    })
  } catch (error) {
    console.error(error)

    // return the error message
    return res.status(500).end()
  }
}

export default withMethods(['GET'], handler)
