import { Alert, Button, Typography } from 'antd'
import { ExportOutlined } from '@ant-design/icons'

const { Text, Link } = Typography

interface OpenNodeCharge {
  id: string
  status: string
  amount: number
  currency: string
  hosted_checkout_url: string | null
  created_at: string
  last_webhook_at: string | null
}

interface InvoiceData {
  id: string
  number: string | null
  status: string
  amount_due: number
  currency: string
  created: number
  due_date: number | null
  hosted_invoice_url: string | null
  payment_intent: {
    status?: string
  } | null
  metadata: {
    isCryptoPayment?: string
    paymentProvider?: string
  }
  opennode_charge?: OpenNodeCharge | null
}

interface InvoiceManagementProps {
  onPortalAccess?: () => void
  isLoading?: boolean
}

export const InvoiceManagement = ({ onPortalAccess, isLoading }: InvoiceManagementProps) => {
  return (
    <div className="mb-6">
      <Alert
        description={
          <div className="space-y-4">
            <p>
              View and manage all your invoices, including payment history and pending payments.
            </p>

            <div className="flex gap-2 mb-4">
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={onPortalAccess}
                loading={isLoading}
              >
                View All Invoices
              </Button>
            </div>
          </div>
        }
        type="info"
        showIcon
      />
    </div>
  )
}
