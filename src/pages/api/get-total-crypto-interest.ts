import { withMethods } from '@/lib/api-middlewares/with-methods'
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

async function getTotalCryptoInterest() {
  try {
    // Get all settings with crypto interest data
    const cryptoInterestSettings = await prisma.setting.count({
      where: {
        key: 'crypto_payment_interest',
      },
    })

    // Calculate total interest from all users
    const totalInterest = cryptoInterestSettings

    return { totalInterest, userCount: cryptoInterestSettings }
  } catch (error) {
    captureException(error)
    return { totalInterest: 0, userCount: 0 }
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { totalInterest, userCount } = await getTotalCryptoInterest()

    res.status(200).json({
      totalInterest,
      userCount,
    })
  } catch (error) {
    captureException(error)
    res.status(500).json({ error: error.message })
  }
}

export default withMethods(['GET'], handler)
