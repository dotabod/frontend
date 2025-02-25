import prisma from '@/lib/db'
import { GRACE_PERIOD_END } from '@/utils/subscription'
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client'

async function downgradeUsersAfterGracePeriod() {
  const now = new Date()

  // Only run if we're past the grace period
  if (now < GRACE_PERIOD_END) {
    console.log('Grace period not yet ended. Exiting.')
    return
  }

  console.log('Starting downgrade process for users without paid subscriptions...')

  // Find users without a paid subscription
  const usersToDowngrade = await prisma.user.findMany({
    where: {
      OR: [
        // Users with no subscription
        { subscription: { none: {} } },
        // Users with subscription but no Stripe subscription ID
        {
          subscription: {
            some: {
              stripeSubscriptionId: null,
              // Exclude users with lifetime subscriptions or other special cases
              NOT: {
                transactionType: 'LIFETIME',
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  })

  console.log(`Found ${usersToDowngrade.length} users to downgrade to Free tier`)

  // Process in batches to avoid memory issues
  const BATCH_SIZE = 100
  for (let i = 0; i < usersToDowngrade.length; i += BATCH_SIZE) {
    const batch = usersToDowngrade.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (user) => {
        // Upsert subscription to ensure all users have a record
        await prisma.subscription.upsert({
          where: {
            userId: user.id,
          },
          update: {
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.CANCELED,
            updatedAt: now,
          },
          create: {
            userId: user.id,
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.CANCELED,
            createdAt: now,
            updatedAt: now,
          },
        })
      }),
    )

    console.log(
      `Processed batch ${i / BATCH_SIZE + 1} of ${Math.ceil(usersToDowngrade.length / BATCH_SIZE)}`,
    )
  }

  console.log('Downgrade process completed successfully')
}

// Execute the function
downgradeUsersAfterGracePeriod()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error during downgrade process:', e)
    prisma.$disconnect()
    process.exit(1)
  })
