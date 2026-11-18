import { Button } from 'antd'
import { CreditCardIcon } from 'lucide-react'
import Link from 'next/link'

import { BillingNotice } from '@/components/Billing/billing-notice'
import type { SubscriptionRow } from '@/utils/subscription'

interface PastDueNoticeProps {
  pathname: string
  subscription: SubscriptionRow | null
}

// A failed renewal used to surface only on the billing page, which most
// Members never open, so it shows on every dashboard page until it is fixed.
export const PastDueNotice = ({ pathname, subscription }: PastDueNoticeProps) => {
  // The billing page shows its own payment-failed notice with the Stripe portal button.
  if (subscription?.status !== 'PAST_DUE' || pathname === '/dashboard/billing') {
    return null
  }

  return (
    <BillingNotice
      tone='error'
      icon={<CreditCardIcon size={18} />}
      title='Your Pro payment failed'
      action={
        <Link href='/dashboard/billing'>
          <Button size='small' type='primary' danger>
            Fix payment
          </Button>
        </Link>
      }
    >
      Update your payment method to keep Pro and avoid cancellation.
    </BillingNotice>
  )
}
