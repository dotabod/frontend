import { captureException } from '@sentry/nextjs'
import { Prisma } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as z from 'zod'
import { getServerSession } from '@/lib/api/getServerSession'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { Settings } from '@/lib/defaultSettings'
import { dynamicSettingSchema, settingKeySchema } from '@/lib/validations/setting'
import { whatsNew } from '@/lib/whatsNew'
import { getSubscription } from '@/utils/subscription'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const settingKey = req.query.settingKey as string

  const keyValidation = settingKeySchema.safeParse(settingKey)
  if (!keyValidation.success) {
    return res.status(422).json({ error: 'Invalid setting key' })
  }

  const validKey = keyValidation.data as keyof typeof settingKeySchema.Values

  if (!session?.user?.id) {
    return res.status(500).end()
  }

  if (req.method === 'GET') {
    return handleGetRequest(req, res, session.user.id, validKey)
  }

  if (req.method === 'PATCH') {
    return handlePatchRequest(req, res, session.user.id, validKey)
  }

  return res.status(405).end() // Method Not Allowed
}

async function handleGetRequest(
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

    return res.status(200).json(setting)
  } catch (error) {
    captureException(error)
    console.error('Error fetching setting:', error)
    return res.status(500).end()
  }
}

async function handlePatchRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  settingKey: keyof typeof settingKeySchema.Values,
) {
  const session = await getServerSession(req, res, authOptions)
  if (session?.user?.isImpersonating) {
    // Filter out obsServerPassword
    if (settingKey === Settings.obsServerPassword) {
      return res.status(403).json({ message: 'Forbidden' })
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

      return res.status(200).json({ status: 'ok' })
    }

    const settingValue: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      settingKey === Settings.wlStatsDays && validatedBody.value === null
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
        where: { key: { in: followMasterKeys }, userId },
        select: { key: true },
      })
      const alreadySet = new Set(existing.map((row) => row.key))
      const toFreeze = followMasterKeys.filter((key) => !alreadySet.has(key))

      if (toFreeze.length > 0) {
        await prisma.$transaction(
          toFreeze.map((key) => prisma.setting.create({ data: { key, userId, value: true } })),
        )
      }
    }

    return res.status(200).json({ status: 'ok' })
  } catch (error) {
    captureException(error)
    console.error('Error updating setting:', error)

    if (error instanceof z.ZodError) {
      return res.status(422).json(error.issues)
    }

    return res.status(500).end()
  }
}

export default withMethods(['GET', 'PATCH'], withAuthentication(handler))
