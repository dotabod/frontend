import { Prisma } from '@prisma/client'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { Settings } from '@/lib/default-settings'
import { dynamicSettingSchema, settingKeySchema } from '@/lib/validations/setting'
import { whatsNew } from '@/lib/whats-new'
import { getSubscription } from '@/utils/subscription'

const handler = async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const settingKeyParam = req.query['setting-key'] ?? req.query.settingKey
  const settingKey = Array.isArray(settingKeyParam) ? settingKeyParam[0] : settingKeyParam

  const keyValidation = settingKeySchema.safeParse(settingKey)
  if (!keyValidation.success) {
    res.status(422).json({ error: 'Invalid setting key' })
    return
  }

  const validKey = keyValidation.data

  if (!session?.user?.id) {
    return res.status(500).end()
  }

  if (req.method === 'GET') {
    return await handleGetRequest(req, res, session.user.id, validKey)
  }

  if (req.method === 'PATCH') {
    return await handlePatchRequest(req, res, session.user.id, validKey)
  }

  // Method Not Allowed
  return res.status(405).end()
}

const handleGetRequest = async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  settingKey: string,
) {
  const session = await getServerSession(req, res, authOptions)

  try {
    const setting = await prisma.setting.findFirst({
      where: {
        key: settingKey,
        userId,
      },
    })

    if (session?.user?.isImpersonating) {
      // Filter out obsServerPassword
      if (setting?.key === Settings.obsServerPassword) {
        setting.value = ''
      }
    }

    res.status(200).json(setting)
    return
  } catch (error) {
    captureException(error)
    console.error('Error fetching setting:', error)
    return res.status(500).end()
  }
}

const handlePatchRequest = async function handlePatchRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  settingKey: keyof typeof settingKeySchema.Values,
) {
  const session = await getServerSession(req, res, authOptions)
  if (session?.user?.isImpersonating) {
    // Filter out obsServerPassword
    if (settingKey === Settings.obsServerPassword) {
      res.status(403).json({ message: 'Forbidden' })
      return
    }
  }

  try {
    // Get user's subscription
    const subscription = await getSubscription(userId)

    const parsedBody = JSON.parse(req.body)
    parsedBody.key = settingKey

    // Pass subscription to schema validation
    const schema = dynamicSettingSchema(settingKey, subscription)
    const validatedBody = schema.parse(parsedBody)

    if (settingKey === Settings.mmr) {
      await prisma.user.update({
        data: {
          mmr: validatedBody.value as number,
          updatedAt: new Date(),
        },
        where: {
          id: userId,
        },
      })

      res.status(200).json({ status: 'ok' })
      return
    }

    const settingValue: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      [Settings.wlStatsDays, Settings.wlStatsStartDate].includes(settingKey as never) &&
      validatedBody.value === null
        ? Prisma.JsonNull
        : (validatedBody.value as Prisma.InputJsonValue)

    await prisma.setting.upsert({
      create: {
        key: validatedBody.key,
        updatedAt: new Date(),
        userId,
        value: settingValue,
      },
      update: {
        updatedAt: new Date(),
        value: settingValue,
      },
      where: {
        key_userId: {
          key: validatedBody.key,
          userId,
        },
      },
    })

    // Turning the master off shouldn't retroactively disable features the streamer already
    // had. Freeze every currently-registered follow-master feature to its enabled state,
    // unless the streamer already made an explicit choice for it. Anything added to the
    // registry after this point has no row yet, so it correctly falls through to the
    // (now-off) master.
    if (settingKey === Settings.autoOptInNewFeatures && validatedBody.value === false) {
      const followMasterKeys = whatsNew
        .filter((entry): entry is typeof entry & { settingKey: string } =>
          Boolean(entry.followsNewFeatureMaster && entry.settingKey),
        )
        .map((entry) => entry.settingKey)

      const existing = await prisma.setting.findMany({
        select: { key: true },
        where: { key: { in: followMasterKeys }, userId },
      })
      const alreadySet = new Set(existing.map((row) => row.key))
      const toFreeze = followMasterKeys.filter((key) => !alreadySet.has(key))

      if (toFreeze.length > 0) {
        await prisma.$transaction(
          toFreeze.map((key) => prisma.setting.create({ data: { key, userId, value: true } })),
        )
      }
    }

    res.status(200).json({ status: 'ok' })
    return
  } catch (error) {
    captureException(error)
    console.error('Error updating setting:', error)

    if (error instanceof z.ZodError) {
      res.status(422).json(error.issues)
      return
    }

    return res.status(500).end()
  }
}

export default withMethods(['GET', 'PATCH'], withAuthentication(handler))
