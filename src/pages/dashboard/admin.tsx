import DashboardShell from '@/components/Dashboard/DashboardShell'
import { DeleteOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Radio,
  Spin,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography
const { TextArea } = Input
const { TabPane } = Tabs

type ScheduledMessage = {
  id: string
  message: string
  scheduledAt: string | null
  sentAt: string | null
  status: 'pending' | 'delivered' | 'failed'
  createdAt: string
}

interface FormValues {
  message: string
  messageType: 'when_online' | 'scheduled'
  scheduledDate?: dayjs.Dayjs
}

function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [messageType, setMessageType] = useState<'when_online' | 'scheduled'>('when_online')
  const [form] = Form.useForm()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.role || !session.user.role.includes('admin')) {
      router.push('/404')
      return
    }

    fetchMessages()
  }, [session, status, router])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/scheduled-messages')
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      message.error('Failed to fetch scheduled messages')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: FormValues) => {
    if (!values.message.trim()) {
      message.error('Message cannot be empty')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/admin/scheduled-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: values.message,
          scheduledAt:
            values.messageType === 'scheduled' && values.scheduledDate
              ? values.scheduledDate.format('YYYY-MM-DDTHH:mm:ss')
              : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule message')
      }

      message.success(
        `Message ${values.messageType === 'when_online' ? 'created' : 'scheduled'} successfully`,
      )
      form.resetFields()
      fetchMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      message.error('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMessage = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/scheduled-messages/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      message.success('Message deleted successfully')
      fetchMessages()
    } catch (error) {
      message.error('Failed to delete message')
      console.error(error)
    }
  }

  const columns = [
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'blue',
          delivered: 'green',
          failed: 'red',
        }
        return (
          <span style={{ color: colorMap[status] || 'default' }}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )
      },
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (date ? dayjs(date).format('MMM D, YYYY HH:mm') : 'N/A'),
    },
    {
      title: 'Scheduled For',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (date: string) => (date ? dayjs(date).format('MMM D, YYYY HH:mm') : 'Instant'),
    },
    {
      title: 'Sent At',
      dataIndex: 'sentAt',
      key: 'sentAt',
      render: (date: string) => (date ? dayjs(date).format('MMM D, YYYY HH:mm') : 'Not sent yet'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: ScheduledMessage) =>
        record.status === 'pending' && (
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteMessage(record.id)} />
        ),
    },
  ]

  const items: TabsProps['items'] = [
    {
      key: 'create',
      label: 'Create Message',
      children: (
        <Card>
          <Form
            form={form}
            layout='vertical'
            onFinish={handleSubmit}
            initialValues={{ messageType: 'when_online' }}
          >
            <Form.Item name='messageType' label='Message Type'>
              <Radio.Group optionType='default' onChange={(e) => setMessageType(e.target.value)}>
                <Radio.Button value='when_online'>Send When User Comes Online</Radio.Button>
                <Radio.Button value='scheduled'>
                  Scheduled (Send When User Comes Online After Date)
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name='message'
              label='Message Content'
              rules={[{ required: true, message: 'Please enter a message' }]}
            >
              <TextArea rows={4} placeholder='Enter your message here...' />
            </Form.Item>

            {messageType === 'scheduled' && (
              <Form.Item
                name='scheduledDate'
                label='Scheduled Date'
                rules={[{ required: true, message: 'Please select a date and time' }]}
              >
                <DatePicker
                  showTime
                  format='YYYY-MM-DD HH:mm:ss'
                  placeholder='Select date and time'
                />
              </Form.Item>
            )}

            <Form.Item>
              <Button type='primary' htmlType='submit' block>
                {messageType === 'when_online' ? 'Send Message Now' : 'Schedule Message'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'history',
      label: 'Message History',
      children: (
        <Card>
          <Table
            dataSource={messages}
            columns={columns}
            rowKey='id'
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
  ]

  if (status === 'loading' || loading) {
    return (
      <Spin>
        <Title level={2} style={{ marginBottom: 24 }}>
          Admin Panel - Scheduled Messages
        </Title>
      </Spin>
    )
  }

  if (!session?.user?.role || !session.user.role.includes('admin')) {
    return null
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        Admin Panel - Scheduled Messages
      </Title>

      <Tabs defaultActiveKey='create' items={items} />
    </div>
  )
}

AdminPage.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default AdminPage
