import { GiftIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface GiftSubscriptionCardProps {
  senderName: string
  giftType: string
  giftQuantity: number
  giftMessage?: string
  endDate?: Date | null
  createdAt: Date
}

export function GiftSubscriptionCard({
  senderName,
  giftType,
  giftQuantity,
  giftMessage,
  endDate,
  createdAt,
}: GiftSubscriptionCardProps) {
  // Format the gift type for display
  const formattedGiftType =
    giftType === 'lifetime'
      ? 'Lifetime'
      : giftType === 'annual'
        ? `${giftQuantity} ${giftQuantity === 1 ? 'Year' : 'Years'}`
        : `${giftQuantity} ${giftQuantity === 1 ? 'Month' : 'Months'}`

  // Format the end date for display
  const formattedEndDate = endDate
    ? new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(endDate)
    : 'Never expires'

  // Format the created date as relative time
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true })

  return (
    <div className='overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm'>
      <div className='bg-muted/50 p-6 pb-4'>
        <div className='flex items-center justify-between'>
          <h3 className='flex items-center gap-2 text-lg font-semibold leading-none tracking-tight'>
            <GiftIcon className='h-5 w-5 text-primary' />
            <span>Gift Subscription</span>
          </h3>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              giftType === 'lifetime'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground'
            }`}
          >
            {formattedGiftType}
          </span>
        </div>
        <p className='text-sm text-muted-foreground'>From {senderName}</p>
      </div>
      <div className='p-6 pt-4'>
        {giftMessage && <div className='mb-4 rounded-md bg-muted p-3 italic'>"{giftMessage}"</div>}
        <div className='space-y-2 text-sm'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Status:</span>
            <span className='font-medium'>Active</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Expires:</span>
            <span className='font-medium'>{formattedEndDate}</span>
          </div>
        </div>
      </div>
      <div className='border-t bg-muted/30 px-6 py-3 text-xs text-muted-foreground'>
        Gifted {timeAgo}
      </div>
    </div>
  )
}
