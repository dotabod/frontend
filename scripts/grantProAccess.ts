import prisma from '@/lib/db'
import { GRACE_PERIOD_END } from '@/utils/subscription'
import { SubscriptionStatus, SubscriptionTier, TransactionType } from '@prisma/client'

async function grantProAccessToAllUsers() {
  console.log('Starting process to grant Pro access to all users...')

  // Get all users without an active paid subscription
  const users = await prisma.user.findMany({
    where: {
      OR: [
        // Users with no subscription
        { subscription: { none: {} } },
        // Users with subscription but not active paid
        {
          subscription: {
            some: {
              NOT: {
                AND: [
                  { status: SubscriptionStatus.ACTIVE },
                  { stripeSubscriptionId: { not: null } },
                ],
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  })

  console.log(`Found ${users.length} users to grant Pro access`)

  // Process in batches
  const BATCH_SIZE = 100
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (user) => {
        // Upsert subscription to ensure all users have a Pro record
        await prisma.subscription.upsert({
          where: {
            userId: user.id,
            OR: [{ status: SubscriptionStatus.ACTIVE }, { stripeSubscriptionId: { not: null } }],
          },
          update: {
            tier: SubscriptionTier.PRO,
            status: SubscriptionStatus.TRIALING,
            currentPeriodEnd: GRACE_PERIOD_END,
            updatedAt: new Date(),
            transactionType: TransactionType.RECURRING,
          },
          create: {
            userId: user.id,
            tier: SubscriptionTier.PRO,
            status: SubscriptionStatus.TRIALING,
            currentPeriodEnd: GRACE_PERIOD_END,
            createdAt: new Date(),
            updatedAt: new Date(),
            transactionType: TransactionType.RECURRING,
          },
        })
      }),
    )

    console.log(`Processed batch ${i / BATCH_SIZE + 1} of ${Math.ceil(users.length / BATCH_SIZE)}`)
  }

  console.log('Pro access granted successfully to all users')
}

// Execute the function
grantProAccessToAllUsers()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error during Pro access grant process:', e)
    prisma.$disconnect()
    process.exit(1)
  })
