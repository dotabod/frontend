import { PrismaClient } from '@prisma/client'
import type { Subscription } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'

import { hasCryptoInvoiceBeenCredited } from '@/lib/stripe/utils/crypto-invoice-credit'

const subscription: Subscription = {
  cancelAtPeriodEnd: true,
  createdAt: new Date('2026-10-11T17:00:00.000Z'),
  currentPeriodEnd: new Date('2026-11-11T17:00:00.000Z'),
  id: 'sub_credited',
  isGift: false,
  metadata: {},
  status: 'ACTIVE',
  stripeCustomerId: 'cus_crypto',
  stripePriceId: 'price_monthly',
  stripeSubscriptionId: 'crypto_opennode_in_paid',
  tier: 'PRO',
  transactionType: 'RECURRING',
  updatedAt: new Date('2026-10-11T17:00:00.000Z'),
  userId: 'user_crypto',
}

describe(hasCryptoInvoiceBeenCredited, () => {
  it('looks for every marker the invoice handlers write for a credited invoice', async () => {
    const db = new PrismaClient()
    const findFirst = vi.spyOn(db.subscription, 'findFirst').mockResolvedValue(subscription)

    await expect(hasCryptoInvoiceBeenCredited(db, 'in_paid')).resolves.toBeTruthy()

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      select: { id: true },
      where: {
        OR: [
          { stripeSubscriptionId: 'crypto_opennode_in_paid' },
          { metadata: { equals: 'in_paid', path: ['openNodeInvoiceId'] } },
          { metadata: { equals: 'in_paid', path: ['lastRenewalInvoiceId'] } },
          { metadata: { equals: 'in_paid', path: ['previousRenewalInvoiceId'] } },
        ],
      },
    })
  })

  it('reports an invoice that nothing was credited for', async () => {
    const db = new PrismaClient()
    vi.spyOn(db.subscription, 'findFirst').mockResolvedValue(null)

    await expect(hasCryptoInvoiceBeenCredited(db, 'in_unpaid')).resolves.toBeFalsy()
  })
})
