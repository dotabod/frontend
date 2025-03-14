import prisma from '@/lib/db'
import { formatDate } from '@/utils/formatDate'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the user's session
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = session.user.id

    // Find all active gift subscriptions for this user
    const giftSubscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        isGift: true,
        status: 'ACTIVE',
      },
      orderBy: {
        currentPeriodEnd: 'desc', // Order by end date descending
      },
      include: {
        giftDetails: true, // Include gift details if needed
      },
    })

    const giftCount = giftSubscriptions.length

    if (giftCount === 0) {
      return res.status(200).json({
        hasGifts: false,
        giftCount: 0,
        giftMessage: '',
      })
    }

    // Create a message about the gifts
    let giftMessage = ''
    if (giftCount === 1) {
      const endDate = giftSubscriptions[0].currentPeriodEnd
        ? formatDate(giftSubscriptions[0].currentPeriodEnd)
        : 'unknown date'
      giftMessage = `You have received a gift subscription that extends your access until ${endDate}. This gift will not auto-renew.`
    } else {
      // Find the furthest end date
      const furthestEndDate = giftSubscriptions[0].currentPeriodEnd
        ? formatDate(giftSubscriptions[0].currentPeriodEnd)
        : 'unknown date'
      giftMessage = `You have received ${giftCount} gift subscriptions that extend your access until ${furthestEndDate}. These gifts will not auto-renew.`
    }

    return res.status(200).json({
      hasGifts: true,
      giftCount,
      giftMessage,
      giftSubscriptions: giftSubscriptions.map((sub) => ({
        id: sub.id,
        endDate: sub.currentPeriodEnd,
        senderName: sub.giftDetails?.senderName || 'Anonymous',
      })),
    })
  } catch (error) {
    console.error('Error fetching gift subscriptions:', error)
    return res.status(500).json({ error: 'Failed to fetch gift subscriptions' })
  }
}
