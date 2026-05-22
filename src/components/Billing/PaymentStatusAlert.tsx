import { App, Button } from 'antd'
import { Loader2Icon } from 'lucide-react'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BillingNotice } from './BillingNotice'

const Spinner = () => <Loader2Icon size={16} className='animate-spin' />

// Anything that will not resolve itself by polling again. Must mirror the
// statusInfo.type values emitted by /api/payment-status (processing is the only
// non-terminal state; warning = amount mismatch, unknown = unclassified).
const TERMINAL_STATUSES = ['success', 'error', 'cancelled', 'expired', 'warning', 'unknown']
const isTerminalStatus = (type?: string) => !!type && TERMINAL_STATUSES.includes(type)

interface PaymentStatus {
  invoiceId: string
  chargeId: string
  status: string
  amount: number
  currency: string
  createdAt: string
  statusInfo: {
    message: string
    type: string
    description: string
    canRetry: boolean
  }
  invoice: {
    id: string
    number: string | null
    amount: number
    currency: string
    status: string
  }
}

export const PaymentStatusAlert = () => {
  const router = useRouter()
  const { notification } = App.useApp()
  const { payment, crypto, invoice } = router.query
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchPaymentStatus = useCallback(
    async (invoiceId: string): Promise<PaymentStatus | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/payment-status?invoiceId=${invoiceId}`)
        if (!response.ok) {
          throw new Error("We couldn't reach the payment service.")
        }

        const data = (await response.json()) as PaymentStatus
        if (mountedRef.current) setPaymentStatus(data)
        return data
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "We couldn't check your payment status.")
        }
        return null
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (
      !(payment === 'processing' && crypto === 'true' && invoice && typeof invoice === 'string')
    ) {
      return
    }

    let intervalId: ReturnType<typeof setInterval> | undefined

    const poll = async () => {
      const data = await fetchPaymentStatus(invoice)
      // Stop polling once the payment reaches a terminal state.
      if (data && isTerminalStatus(data.statusInfo?.type) && intervalId) {
        clearInterval(intervalId)
      }
    }

    poll()
    intervalId = setInterval(poll, 30000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [payment, crypto, invoice, fetchPaymentStatus])

  const handleRetry = async () => {
    try {
      const res = await fetch('/api/stripe/crypto-invoice', { method: 'POST' })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(errBody?.error || `Request failed: ${res.status}`)
      }
      const { url } = await res.json()
      if (!url) throw new Error('No payment URL returned')
      window.location.href = url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to refresh crypto invoice URL', err)
      notification.error({
        message: 'Could not refresh payment link',
        description: message,
        placement: 'bottomRight',
      })
    }
  }

  const handleDismiss = () => {
    router.replace('/dashboard/billing', undefined, { shallow: true })
  }

  if (!payment || payment !== 'processing' || crypto !== 'true' || !invoice) {
    return null
  }

  if (loading && !paymentStatus) {
    return (
      <BillingNotice tone='info' icon={<Spinner />} title='Checking your payment'>
        Crypto payments usually confirm within a few minutes.
      </BillingNotice>
    )
  }

  if (error) {
    return (
      <BillingNotice
        tone='error'
        title="We couldn't check your payment"
        action={
          <Button size='small' onClick={() => fetchPaymentStatus(invoice as string)}>
            Try again
          </Button>
        }
      >
        {error}
      </BillingNotice>
    )
  }

  if (!paymentStatus) {
    return null
  }

  const getAlertType = (statusType: string) => {
    switch (statusType) {
      case 'processing':
        return 'info' as const
      case 'success':
        return 'success' as const
      case 'error':
      case 'cancelled':
        return 'error' as const
      case 'warning':
      case 'expired':
        return 'warning' as const
      default:
        return 'info' as const
    }
  }

  return (
    <BillingNotice
      tone={getAlertType(paymentStatus.statusInfo.type)}
      icon={paymentStatus.statusInfo.type === 'processing' ? <Spinner /> : undefined}
      title={paymentStatus.statusInfo.message}
      action={
        <div className='flex flex-wrap gap-2'>
          {paymentStatus.statusInfo.canRetry && (
            <Button size='small' onClick={handleRetry}>
              Get a new payment link
            </Button>
          )}
          {paymentStatus.statusInfo.type === 'processing' && (
            <Button size='small' onClick={() => fetchPaymentStatus(paymentStatus.invoiceId)}>
              Refresh status
            </Button>
          )}
          <Button size='small' type='text' onClick={handleDismiss}>
            Dismiss
          </Button>
        </div>
      }
    >
      <p>{paymentStatus.statusInfo.description}</p>
      <dl className='mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs opacity-80'>
        <dt>Invoice</dt>
        <dd>{paymentStatus.invoice.number || paymentStatus.invoiceId}</dd>
        <dt>Amount</dt>
        <dd>
          {paymentStatus.amount} {(paymentStatus.currency ?? '').toUpperCase()}
        </dd>
        <dt>Charge ID</dt>
        <dd className='truncate'>{paymentStatus.chargeId}</dd>
      </dl>
    </BillingNotice>
  )
}
