import { z } from 'zod/v4'

export const giftTextSchema = z
  .string()
  .max(200, 'Gift text must be 200 characters or fewer')
  .refine((text) => !text.includes('<') && !text.includes('>'), {
    message: 'Gift text cannot contain HTML markup',
  })

export const giftCheckoutSchema = z.object({
  giftMessage: giftTextSchema.optional(),
  giftSenderEmail: z.email().optional(),
  giftSenderName: giftTextSchema.optional(),
  priceId: z.string().min(1, 'Price ID is required'),
  quantity: z.number().int().min(1).default(1),
  recipientUsername: z.string().min(1, 'Recipient username is required'),
})

export type GiftCheckoutRequest = z.infer<typeof giftCheckoutSchema>
