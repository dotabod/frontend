import type { Prisma } from '@prisma/client'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'
import { createLifetimePurchase } from './checkout-events'
import { SubscriptionStatus } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'

/**
 * Handles a charge succeeded event from Stripe
 * @param charge The Stripe charge object
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleChargeSucceeded(
  charge: Stripe.Charge,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const userId = charge.metadata?.userId
  if (!userId) return false

  return (
    (await withErrorHandling(
      async () => {
        await createLifetimePurchase(
          userId,
          charge.customer as string,
          charge.amount > 0 ? charge.amount.toString() : null,
          tx,
        )
        return true
      },
      `handleChargeSucceeded(${charge.id})`,
      userId,
    )) !== null
  )
}

/**
 * Handles a charge refunded event from Stripe
 * @param charge The Stripe charge object with refund information
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleChargeRefunded(
  charge: Stripe.Charge,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  console.log(`Processing refund for charge ${charge.id}, amount: ${charge.amount_refunded}`)

  // Process standard refunds with metadata
  const userId = charge.metadata?.userId
  if (userId) {
    console.log(`Found userId ${userId} in charge metadata`)
    return (
      (await withErrorHandling(
        async () => {
          // Find any lifetime purchases associated with this charge
          const purchase = await tx.subscription.findFirst({
            where: {
              userId,
              stripeCustomerId: charge.customer as string,
              transactionType: 'LIFETIME',
            },
          })

          if (purchase) {
            // If fully refunded, mark the purchase as canceled
            if (charge.refunded) {
              await tx.subscription.update({
                where: { id: purchase.id },
                data: {
                  status: SubscriptionStatus.CANCELED,
                  metadata: {
                    ...((purchase.metadata as Record<string, unknown>) || {}),
                    refundedAt: new Date().toISOString(),
                    refundAmount:
                      charge.amount_refunded > 0 ? charge.amount_refunded.toString() : null,
                    refundId: charge.refunds?.data?.[0]?.id || null,
                  },
                },
              })
            }
            // If partially refunded, update the metadata
            else if (charge.amount_refunded > 0) {
              await tx.subscription.update({
                where: { id: purchase.id },
                data: {
                  metadata: {
                    ...((purchase.metadata as Record<string, unknown>) || {}),
                    partiallyRefundedAt: new Date().toISOString(),
                    refundAmount: charge.amount_refunded.toString(),
                    refundId: charge.refunds?.data?.[0]?.id || null,
                  },
                },
              })
            }
          }

          // Check if this is a gift subscription refund
          await handleGiftSubscriptionRefund(charge, tx)

          return true
        },
        `handleChargeRefunded(${charge.id})`,
        userId,
      )) !== null
    )
  }

  // Handle cases where metadata is missing but we have a payment intent
  // This is especially important for gift subscriptions
  if (charge.payment_intent) {
    console.log(`No userId in metadata, but found payment_intent ${charge.payment_intent}`)
    return (
      (await withErrorHandling(
        async () => {
          // Process gift subscription refund directly
          await handleGiftSubscriptionRefund(charge, tx)
          return true
        },
        `handleChargeRefunded(${charge.id})`,
        'system',
      )) !== null
    )
  }

  console.log(`Unable to process refund for charge ${charge.id}: no userId or payment_intent`)
  return false
}

/**
 * Handles a gift subscription refund by adjusting any related self-subscriptions
 * @param charge The Stripe charge object with refund information
 * @param tx The transaction client
 */
async function handleGiftSubscriptionRefund(
  charge: Stripe.Charge,
  tx: Prisma.TransactionClient,
): Promise<void> {
  // Only process full refunds
  if (!charge.refunded) {
    console.log(`Skipping charge ${charge.id}: not fully refunded`)
    return
  }

  // Find the checkout session associated with this charge
  const paymentIntent = charge.payment_intent as string
  if (!paymentIntent) {
    console.log(`Skipping charge ${charge.id}: no payment intent`)
    return
  }

  console.log(`Looking up checkout session for payment intent ${paymentIntent}`)
  // Find the checkout session that created this payment
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntent,
    limit: 1,
  })

  if (sessions.data.length === 0) {
    console.log(`No checkout session found for payment intent ${paymentIntent}`)
    return
  }
  const session = sessions.data[0]
  console.log(`Found checkout session ${session.id} for payment intent ${paymentIntent}`)

  // Check if this was a gift subscription
  if (session.metadata?.isGift !== 'true') {
    console.log(`Checkout session ${session.id} is not a gift subscription`)
    return
  }

  const recipientUserId = session.metadata?.recipientUserId
  if (!recipientUserId) {
    console.log(`Checkout session ${session.id} has no recipientUserId`)
    return
  }

  console.log(`Processing gift subscription refund for recipient ${recipientUserId}`)

  // Find the gift subscription record - first try by checkout session ID
  let giftSubscription = await tx.subscription.findFirst({
    where: {
      userId: recipientUserId,
      isGift: true,
      metadata: {
        path: ['checkoutSessionId'],
        equals: session.id,
      },
    },
  })

  if (giftSubscription) {
    console.log(`Found gift subscription by checkout session ID: ${giftSubscription.id}`)
  } else {
    // If not found by session ID, try by payment intent
    giftSubscription = await tx.subscription.findFirst({
      where: {
        userId: recipientUserId,
        isGift: true,
        metadata: {
          path: ['paymentIntentId'],
          equals: paymentIntent,
        },
      },
    })

    if (giftSubscription) {
      console.log(`Found gift subscription by payment intent: ${giftSubscription.id}`)
    } else {
      // If still not found, try to find any gift subscription for this user that matches the amount
      if (charge.amount > 0) {
        console.log(`Searching for gift subscription by amount: ${charge.amount}`)
        const possibleGiftSubscriptions = await tx.subscription.findMany({
          where: {
            userId: recipientUserId,
            isGift: true,
            status: 'ACTIVE',
          },
        })

        console.log(`Found ${possibleGiftSubscriptions.length} possible gift subscriptions`)

        // Find a subscription with matching amount in metadata
        const matchingSubscription = possibleGiftSubscriptions.find((sub) => {
          const metadata = (sub.metadata as Record<string, unknown>) || {}
          return metadata.amount === charge.amount.toString()
        })

        if (matchingSubscription) {
          console.log(`Found gift subscription by amount: ${matchingSubscription.id}`)
          giftSubscription = matchingSubscription
        }
      }
    }
  }

  if (!giftSubscription) {
    console.log(`No matching gift subscription found for refund of payment ${paymentIntent}`)
    return
  }

  console.log(`Canceling gift subscription ${giftSubscription.id} due to refund`)
  // Mark the gift subscription as canceled
  await tx.subscription.update({
    where: { id: giftSubscription.id },
    data: {
      status: SubscriptionStatus.CANCELED,
      metadata: {
        ...((giftSubscription.metadata as Record<string, unknown>) || {}),
        refundedAt: new Date().toISOString(),
        refundId: charge.refunds?.data?.[0]?.id || null,
        paymentIntentId: paymentIntent, // Store this for future reference
      },
    },
  })

  console.log(`Marked gift subscription ${giftSubscription.id} as canceled due to refund`)

  // Find any self-subscriptions that might have been extended due to this gift
  const selfSubscription = await tx.subscription.findFirst({
    where: {
      userId: recipientUserId,
      isGift: false,
      status: 'TRIALING',
    },
  })

  // Variable to track if we've handled the subscription adjustment
  let handledSubscriptionAdjustment = false

  if (selfSubscription?.stripeSubscriptionId) {
    console.log(
      `Found self-subscription ${selfSubscription.id} with Stripe ID ${selfSubscription.stripeSubscriptionId}`,
    )

    // Check if this subscription has an extended trial period due to gifts
    const stripeSubscription = await stripe.subscriptions.retrieve(
      selfSubscription.stripeSubscriptionId,
    )

    // If the subscription has metadata indicating it was extended for gifts
    if (stripeSubscription.metadata?.giftBasedTrialDays) {
      console.log(
        `Self-subscription has giftBasedTrialDays: ${stripeSubscription.metadata.giftBasedTrialDays}`,
      )

      // Recalculate the appropriate trial period without the refunded gift
      const giftBasedTrialDays = Number.parseInt(stripeSubscription.metadata.giftBasedTrialDays, 10)

      // Find all remaining active gift subscriptions
      const remainingGifts = await tx.subscription.findMany({
        where: {
          userId: recipientUserId,
          isGift: true,
          status: 'ACTIVE',
        },
        select: {
          currentPeriodEnd: true,
        },
      })

      console.log(`User has ${remainingGifts.length} remaining active gift subscriptions`)

      // If there are no remaining gifts, adjust the trial period to the standard 14 days
      // Otherwise, keep the current trial period (which accounts for other gifts)
      if (remainingGifts.length === 0) {
        const standardTrialDays = 14
        const trialEnd = Math.floor(Date.now() / 1000) + standardTrialDays * 24 * 60 * 60
        const currentTrialEnd = stripeSubscription.trial_end || 0

        console.log(
          `Adjusting trial period: current end ${new Date(currentTrialEnd * 1000).toISOString()}, new end ${new Date(trialEnd * 1000).toISOString()}`,
        )

        // Only adjust if the new trial period would end sooner than the current one
        if (trialEnd < currentTrialEnd) {
          await stripe.subscriptions.update(selfSubscription.stripeSubscriptionId, {
            trial_end: trialEnd,
            pause_collection: '',
            metadata: {
              ...stripeSubscription.metadata,
              giftBasedTrialDays: '0',
              giftRefunded: 'true',
              refundedAt: new Date().toISOString(),
            },
          })

          console.log(
            `Adjusted trial period for subscription ${selfSubscription.stripeSubscriptionId} after gift refund`,
          )
          handledSubscriptionAdjustment = true
        } else {
          console.log('No trial adjustment needed: new trial end would be later than current end')
        }
      } else {
        // User still has remaining gifts, recalculate the trial end to match their remaining gifts
        console.log(`Recalculating trial period based on ${remainingGifts.length} remaining gifts`)

        // Find the latest expiration date among remaining gifts
        let latestExpirationDate = new Date()
        for (const gift of remainingGifts) {
          if (gift.currentPeriodEnd && gift.currentPeriodEnd > latestExpirationDate) {
            latestExpirationDate = gift.currentPeriodEnd
          }
        }

        console.log(`Latest gift expiration date: ${latestExpirationDate.toISOString()}`)

        // Convert to timestamp for Stripe
        const newTrialEnd = Math.floor(latestExpirationDate.getTime() / 1000)

        // Update the subscription with the recalculated trial end
        await stripe.subscriptions.update(selfSubscription.stripeSubscriptionId, {
          trial_end: newTrialEnd,
          pause_collection: '',
          metadata: {
            ...stripeSubscription.metadata,
            adjustedAfterGiftRefund: 'true',
            adjustedAt: new Date().toISOString(),
            remainingGifts: remainingGifts.length.toString(),
          },
        })

        console.log(
          `Adjusted trial period for subscription ${selfSubscription.stripeSubscriptionId} to end at ${latestExpirationDate.toISOString()}`,
        )
        handledSubscriptionAdjustment = true
      }
    } else {
      console.log('Self-subscription does not have giftBasedTrialDays metadata')
    }
  } else {
    console.log(
      `No trialing self-subscription found for user ${recipientUserId} or missing stripeSubscriptionId`,
    )
  }

  // Check for remaining gift subscriptions regardless of metadata
  const remainingActiveGifts = await tx.subscription.findMany({
    where: {
      userId: recipientUserId,
      isGift: true,
      status: 'ACTIVE',
    },
  })

  // Only proceed with resuming if there are no remaining active gift subscriptions
  if (remainingActiveGifts.length === 0) {
    console.log('No remaining active gift subscriptions, checking for paused self-subscriptions')

    // Check if the user already has an active self-subscription
    const activeSubscription = await tx.subscription.findFirst({
      where: {
        userId: recipientUserId,
        isGift: false,
        status: 'ACTIVE',
      },
    })

    if (activeSubscription) {
      console.log(
        `User already has an active self-subscription ${activeSubscription.id}, no need to resume paused subscription`,
      )
      return
    }

    // If we have a trialing subscription, adjust it based on remaining gifts
    if (selfSubscription?.stripeSubscriptionId && !handledSubscriptionAdjustment) {
      try {
        console.log(`Checking trial subscription ${selfSubscription.id} status in Stripe`)

        // Get the subscription details from Stripe first
        const stripeSubDetails = await stripe.subscriptions.retrieve(
          selfSubscription.stripeSubscriptionId,
        )

        // Check if there are remaining gift subscriptions
        if (remainingActiveGifts.length > 0) {
          console.log(
            `User has ${remainingActiveGifts.length} remaining active gifts, adjusting trial period`,
          )

          // Find the latest expiration date among remaining gifts
          let latestGiftExpiration = new Date()
          for (const gift of remainingActiveGifts) {
            if (gift.currentPeriodEnd && gift.currentPeriodEnd > latestGiftExpiration) {
              latestGiftExpiration = gift.currentPeriodEnd
            }
          }

          console.log(`Latest gift expiration date: ${latestGiftExpiration.toISOString()}`)

          // Convert to timestamp for Stripe
          const adjustedTrialEnd = Math.floor(latestGiftExpiration.getTime() / 1000)

          // Update the subscription with adjusted trial end
          await stripe.subscriptions.update(selfSubscription.stripeSubscriptionId, {
            trial_end: adjustedTrialEnd,
            pause_collection: '',
            metadata: {
              ...((stripeSubDetails.metadata as Record<string, unknown>) || {}),
              adjustedAfterGiftRefund: 'true',
              adjustedAt: new Date().toISOString(),
              remainingGifts: remainingActiveGifts.length.toString(),
            },
          })

          console.log(`Successfully adjusted trial period to ${latestGiftExpiration.toISOString()}`)

          // Update our database record
          await tx.subscription.update({
            where: { id: selfSubscription.id },
            data: {
              metadata: {
                ...((selfSubscription.metadata as Record<string, unknown>) || {}),
                adjustedAfterGiftRefund: 'true',
                adjustedAt: new Date().toISOString(),
                remainingGifts: remainingActiveGifts.length.toString(),
              },
            },
          })

          return
        }

        // If we reach here, there are no remaining gifts
        // No remaining gifts, revert to standard trial or cancel
        const standardTrialDays = 14
        const now = Math.floor(Date.now() / 1000)
        const standardTrialEnd = now + standardTrialDays * 24 * 60 * 60

        // Check if we've consumed most of the standard trial
        if (
          stripeSubDetails.trial_start &&
          now - stripeSubDetails.trial_start > standardTrialDays * 24 * 60 * 60 * 0.7
        ) {
          // More than 70% of standard trial used, cancel subscription
          console.log(
            `Canceling subscription ${selfSubscription.id} as standard trial was mostly consumed`,
          )

          await stripe.subscriptions.cancel(selfSubscription.stripeSubscriptionId, {
            invoice_now: false,
            prorate: true,
          })

          await tx.subscription.update({
            where: { id: selfSubscription.id },
            data: {
              status: SubscriptionStatus.CANCELED,
              metadata: {
                ...((selfSubscription.metadata as Record<string, unknown>) || {}),
                canceledAfterGiftRefund: 'true',
                canceledAt: new Date().toISOString(),
              },
            },
          })

          console.log(`Successfully canceled subscription ${selfSubscription.id}`)
          return
        }

        // Still within reasonable trial period, revert to standard trial
        console.log(`Reverting to standard trial period for subscription ${selfSubscription.id}`)

        await stripe.subscriptions.update(selfSubscription.stripeSubscriptionId, {
          trial_end: standardTrialEnd,
          pause_collection: '',
          metadata: {
            ...((stripeSubDetails.metadata as Record<string, unknown>) || {}),
            revertedToStandardTrialAfterGiftRefund: 'true',
            revertedAt: new Date().toISOString(),
          },
        })

        console.log(
          `Successfully reverted to standard trial ending at ${new Date(standardTrialEnd * 1000).toISOString()}`,
        )

        return
      } catch (error) {
        console.error(`Failed to handle subscription ${selfSubscription.id}:`, error)
      }
    }

    // Check for paused subscriptions
    const pausedSelfSubscription = await tx.subscription.findFirst({
      where: {
        userId: recipientUserId,
        isGift: false,
        status: 'PAUSED',
      },
    })

    if (pausedSelfSubscription?.stripeSubscriptionId) {
      console.log(
        `Found paused self-subscription ${pausedSelfSubscription.id}, canceling it and reverting to free tier`,
      )

      try {
        // Instead of resuming the subscription, cancel it entirely
        await stripe.subscriptions.cancel(pausedSelfSubscription.stripeSubscriptionId, {
          invoice_now: false,
          prorate: true,
        })

        // Update the subscription status in the database to CANCELED
        await tx.subscription.update({
          where: { id: pausedSelfSubscription.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            metadata: {
              ...((pausedSelfSubscription.metadata as Record<string, unknown>) || {}),
              canceledAfterGiftRefund: 'true',
              canceledAt: new Date().toISOString(),
            },
          },
        })

        console.log(
          `Successfully canceled subscription ${pausedSelfSubscription.id} and reverted user to free tier`,
        )
      } catch (error) {
        console.error(`Failed to cancel subscription ${pausedSelfSubscription.id}:`, error)
      }
    } else {
      console.log(
        'No paused self-subscription found to resume, checking for any active subscription in Stripe',
      )

      // As a final fallback, look for any self subscription regardless of status
      const anyOtherSelfSubscription = await tx.subscription.findFirst({
        where: {
          userId: recipientUserId,
          isGift: false,
          NOT: {
            status: {
              in: ['ACTIVE', 'TRIALING'],
            },
          },
          ...(selfSubscription ? { NOT: { id: selfSubscription.id } } : {}),
        },
      })

      if (anyOtherSelfSubscription?.stripeSubscriptionId) {
        try {
          // Check the actual status in Stripe
          const stripeStatus = await stripe.subscriptions.retrieve(
            anyOtherSelfSubscription.stripeSubscriptionId,
          )

          // If the subscription is active in Stripe but not in our database, correct it
          if (['active', 'trialing'].includes(stripeStatus.status)) {
            console.log(
              `Found subscription ${anyOtherSelfSubscription.id} that is ${stripeStatus.status} in Stripe but ${anyOtherSelfSubscription.status} in our database, correcting`,
            )

            await tx.subscription.update({
              where: { id: anyOtherSelfSubscription.id },
              data: {
                status:
                  stripeStatus.status === 'active'
                    ? SubscriptionStatus.ACTIVE
                    : SubscriptionStatus.TRIALING,
                metadata: {
                  ...((anyOtherSelfSubscription.metadata as Record<string, unknown>) || {}),
                  statusCorrectedAfterGiftRefund: 'true',
                  statusCorrectedAt: new Date().toISOString(),
                },
              },
            })

            console.log(
              `Successfully corrected subscription status for ${anyOtherSelfSubscription.id}`,
            )
          } else if (stripeStatus.pause_collection) {
            // If it's paused in Stripe, cancel it instead of resuming
            console.log(
              `Found paused subscription ${anyOtherSelfSubscription.id} in Stripe, canceling it instead of resuming`,
            )

            await stripe.subscriptions.cancel(anyOtherSelfSubscription.stripeSubscriptionId, {
              invoice_now: false,
              prorate: true,
            })

            await tx.subscription.update({
              where: { id: anyOtherSelfSubscription.id },
              data: {
                status: SubscriptionStatus.CANCELED,
                metadata: {
                  ...((anyOtherSelfSubscription.metadata as Record<string, unknown>) || {}),
                  canceledAfterGiftRefund: 'true',
                  canceledAt: new Date().toISOString(),
                },
              },
            })

            console.log(`Successfully canceled subscription ${anyOtherSelfSubscription.id}`)
          }
        } catch (error) {
          console.error(
            `Failed to check/correct subscription ${anyOtherSelfSubscription.id}:`,
            error,
          )
        }
      } else {
        console.log('No other self-subscription found, user will revert to free tier')
      }
    }
  } else {
    console.log(
      `Not resuming paused subscription because user still has ${remainingActiveGifts.length} active gift subscriptions`,
    )
  }
}
