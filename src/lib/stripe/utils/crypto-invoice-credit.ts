import type { Prisma } from '@prisma/client'

type SubscriptionReader = Pick<Prisma.TransactionClient, 'subscription'>

/**
 * Whether a paid crypto invoice has already been applied to a subscription. The markers are the
 * ones the invoice handlers write: the `crypto_opennode_<invoiceId>` row created for a first
 * purchase or a plan change, and the invoice id kept in metadata for a lifetime purchase or a
 * renewal. A row counts whatever its status, since a later cancellation does not undo the credit.
 */
export const hasCryptoInvoiceBeenCredited = async function hasCryptoInvoiceBeenCredited(
  db: SubscriptionReader,
  invoiceId: string,
): Promise<boolean> {
  const credited = await db.subscription.findFirst({
    select: { id: true },
    where: {
      OR: [
        { stripeSubscriptionId: `crypto_opennode_${invoiceId}` },
        { metadata: { equals: invoiceId, path: ['openNodeInvoiceId'] } },
        { metadata: { equals: invoiceId, path: ['lastRenewalInvoiceId'] } },
        { metadata: { equals: invoiceId, path: ['previousRenewalInvoiceId'] } },
      ],
    },
  })
  return credited !== null
}
