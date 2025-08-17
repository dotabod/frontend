import { Alert, Button, Spin } from 'antd'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'

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
  const { payment, crypto, invoice } = router.query
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPaymentStatus = useCallback(async (invoiceId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/payment-status?invoiceId=${invoiceId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch payment status')
      }

      const data = await response.json()
      setPaymentStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check payment status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (payment === 'processing' && crypto === 'true' && invoice && typeof invoice === 'string') {
      fetchPaymentStatus(invoice)

      // Poll for status updates every 30 seconds for processing payments
      const interval = setInterval(() => {
        fetchPaymentStatus(invoice)
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [payment, crypto, invoice, fetchPaymentStatus])

  const handleRetry = () => {
    if (paymentStatus?.invoice.id) {
      // Redirect to the Stripe invoice page where they can get a new Bitcoin payment link
      window.open(`https://invoice.stripe.com/${paymentStatus.invoice.id}`, '_blank')
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
      <div className="mb-6">
        <Alert
          message="Checking payment status..."
          description={
            <div className="flex items-center gap-2">
              <Spin size="small" />
              <span>Please wait while we verify your Bitcoin payment</span>
            </div>
          }
          type="info"
          showIcon
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-6">
        <Alert
          message="Unable to check payment status"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => fetchPaymentStatus(invoice as string)}>
              Retry
            </Button>
          }
        />
      </div>
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
    <div className="mb-6">
      <Alert
        message={
          <div className="flex items-center justify-between">
            <span>{paymentStatus.statusInfo.message}</span>
            {paymentStatus.statusInfo.type === 'processing' && (
              <Spin size="small" />
            )}
          </div>
        }
        description={
          <div className="space-y-2">
            <p>{paymentStatus.statusInfo.description}</p>
            <div className="text-sm text-gray-400">
              <div>Invoice: {paymentStatus.invoice.number || paymentStatus.invoiceId}</div>
              <div>Amount: {paymentStatus.amount} {paymentStatus.currency.toUpperCase()}</div>
              <div>Charge ID: {paymentStatus.chargeId}</div>
            </div>
          </div>
        }
        type={getAlertType(paymentStatus.statusInfo.type)}
        showIcon
        closable
        onClose={handleDismiss}
        action={
          <div className="flex gap-2">
            {paymentStatus.statusInfo.canRetry && (
              <Button size="small" onClick={handleRetry}>
                Get New Payment Link
              </Button>
            )}
            {paymentStatus.statusInfo.type === 'processing' && (
              <Button size="small" onClick={() => fetchPaymentStatus(paymentStatus.invoiceId)}>
                Refresh Status
              </Button>
            )}
          </div>
        }
      />
    </div>
  )
}
