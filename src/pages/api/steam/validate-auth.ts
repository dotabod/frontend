import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

// Constants for OpenID verification
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    try {
      const params = req.body

      // Check if we have the required OpenID parameters
      if (
        !params['openid.ns'] ||
        !params['openid.claimed_id'] ||
        !params['openid.identity'] ||
        !params['openid.sig'] ||
        !params['openid.signed']
      ) {
        return res.status(400).json({ message: 'Invalid OpenID parameters' })
      }

      // Extract Steam ID from the claimed_id or identity
      const steamIdentity = params['openid.claimed_id'] || params['openid.identity']
      if (!steamIdentity) {
        return res.status(400).json({ message: 'Missing Steam identity' })
      }

      const steamId64 = steamIdentity.split('/').pop()
      if (!steamId64) {
        return res.status(400).json({ message: 'Could not extract Steam ID' })
      }

      // Validate the response by sending a verification request to Steam
      const verifyParams = new URLSearchParams({
        'openid.assoc_handle': params['openid.assoc_handle'] || '',
        'openid.mode': 'check_authentication',
        'openid.ns': params['openid.ns'],
        'openid.sig': params['openid.sig'],
        'openid.signed': params['openid.signed'],
      })

      // Add all signed parameters to the verification request
      const signedParams = params['openid.signed'].split(',')
      for (const param of signedParams) {
        const fullParam = `openid.${param}`
        if (params[fullParam] !== undefined) {
          verifyParams.append(fullParam, params[fullParam])
        }
      }

      // Send verification request to Steam
      const verifyResponse = await fetch(STEAM_OPENID_URL, {
        body: verifyParams.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      })

      const verifyText = await verifyResponse.text()

      // Check if verification is successful
      if (!verifyText.includes('is_valid:true')) {
        console.error('OpenID verification failed:', verifyText)
        return res.status(400).json({ message: 'OpenID verification failed' })
      }

      // Convert Steam64 to Steam32 ID
      const steam32Id = (BigInt(steamId64) - 76_561_197_960_265_728n).toString()

      // Fetch Steam profile data
      const profileResponse = await fetch(
        `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${
          process.env.STEAM_WEB_API
        }&steamids=${steamId64}`,
      )

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch Steam profile data')
      }

      const profileJson = await profileResponse.json()
      let profileData: {
        avatar?: string
        name?: string
        id?: string
      } | null = null

      if (profileJson?.response?.players?.length > 0) {
        const player = profileJson.response.players[0]
        profileData = {
          avatar: player.avatarfull,
          id: steam32Id,
          name: player.personaname,
        }
      }

      // Save the Steam ID to the user's account
      try {
        // Check if a SteamAccount with this steam32Id already exists
        const existingSteamAccount = await prisma.steamAccount.findUnique({
          where: {
            steam32Id: Number.parseInt(steam32Id, 10),
          },
        })

        if (existingSteamAccount) {
          // If it exists but doesn't include this user yet, add them to connectedUserIds
          if (
            existingSteamAccount.userId !== session.user.id &&
            !existingSteamAccount.connectedUserIds.includes(session.user.id)
          ) {
            await prisma.steamAccount.update({
              data: {
                connectedUserIds: {
                  push: session.user.id,
                },
                updatedAt: new Date(),
              },
              where: {
                steam32Id: Number.parseInt(steam32Id, 10),
              },
            })
          }
        } else {
          // Create a new steam account entry
          await prisma.steamAccount.create({
            data: {
              name: profileData?.name || null,
              steam32Id: Number.parseInt(steam32Id, 10),
              userId: session.user.id,
            },
          })
        }

        // If user doesn't have a primary account yet, set this one as primary
        const user = await prisma.user.findUnique({
          select: {
            steam32Id: true,
          },
          where: {
            id: session.user.id,
          },
        })

        if (!user?.steam32Id) {
          await prisma.user.update({
            data: {
              steam32Id: Number.parseInt(steam32Id, 10),
              updatedAt: new Date(),
            },
            where: {
              id: session.user.id,
            },
          })
        }
      } catch (saveError) {
        captureException(saveError)
        console.error('Error saving Steam ID:', saveError)
        // Continue processing - we'll still return the verified Steam ID even if saving fails
      }

      return res.status(200).json({
        message: 'Steam authentication validated successfully',
        profileData,
        steam32Id,
      })
    } catch (error) {
      captureException(error)
      console.error('Error validating Steam authentication:', error)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

export default withMethods(['POST'], handler)
