import DashboardShell from '@/components/Dashboard/DashboardShell'
import UserSelector from '@/components/Dashboard/UserSelector'
import { Card } from '@/ui/card'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { ScheduledMessage } from '@prisma/client'
import type { TabsProps } from 'antd'
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Progress,
  Space,
  Table,
  Tabs,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import { format } from 'date-fns'
import dayjs from 'dayjs'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const { Title } = Typography
const { TextArea } = Input

interface FormValues {
  message: string
  scheduledDate?: dayjs.Dayjs
  sendAt: string | dayjs.Dayjs | Date
  userId?: string
}

const AdminPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [form] = Form.useForm()
  const [openDialog, setOpenDialog] = useState(false)
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.role || !session.user.role?.includes('admin')) {
      router.push('/404')
      return
    }

    fetchMessages()
  }, [session?.user?.role, status, router.push])

  if (!session?.user?.role?.includes('admin')) {
    return null
  }

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
    try {
      setSubmitting(true)
      const isForAllUsers = !values.userId

      const payload = {
        message: values.message,
        sendAt: values.scheduledDate ? values.scheduledDate.toISOString() : dayjs().toISOString(),
        userId: isForAllUsers ? undefined : values.userId,
        isForAllUsers,
      }

      await axios.post('/api/admin/scheduled-messages', payload)
      message.success('Message scheduled successfully')
      form.resetFields()
      fetchMessages()
    } catch (error) {
      console.error(error)
      message.error('Failed to schedule message')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDialog = (message: ScheduledMessage | null) => {
    if (message) {
      setEditingMessage(message)
      form.setFieldsValue({
        message: message.message,
        sendAt: message.sendAt,
        userId: message.userId || '',
      })
    } else {
      setEditingMessage(null)
      form.setFieldsValue({
        message: '',
        sendAt: new Date(), // Default to now
        userId: '',
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingMessage(null)
    // Reset the form completely to ensure UserSelector is properly cleared
    form.resetFields()
  }

  const handleSubmitDialog = async (values: FormValues) => {
    try {
      setSubmitting(true)
      const isForAllUsers = !values.userId

      const payload = {
        message: values.message,
        sendAt: values.scheduledDate ? values.scheduledDate.toISOString() : dayjs().toISOString(),
        userId: isForAllUsers ? undefined : values.userId,
        isForAllUsers,
      }

      await axios.put(`/api/admin/scheduled-messages/${editingMessage?.id}`, payload)
      message.success('Message updated successfully')
      setOpenDialog(false)
      fetchMessages()
    } catch (error) {
      console.error(error)
      message.error('Failed to update message')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this scheduled message?',
      onOk: async () => {
        try {
          await fetch(`/api/admin/scheduled-messages/${id}`, {
            method: 'DELETE',
          })
          fetchMessages()
        } catch (error) {
          console.error('Error deleting scheduled message:', error)
        }
      },
    })
  }

  const columns: ColumnsType<ScheduledMessage> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      ellipsis: true,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Send At',
      dataIndex: 'sendAt',
      key: 'sendAt',
      render: (text) => (text ? format(new Date(text), 'PPpp') : 'When online'),
    },
    {
      title: 'Recipient',
      key: 'recipient',
      render: (_, record) => (record.isForAllUsers ? 'All Users' : record.userId || 'Unknown'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Delivery Status',
      key: 'deliveryStats',
      render: (_, record) => {
        const stats = (
          record as {
            deliveryStats?: {
              delivered: number
              pending: number
              cancelled: number
              totalTargetUsers: number
              deliveredPercent: number
              pendingPercent: number
              cancelledPercent: number
            }
          }
        ).deliveryStats
        if (!stats) return 'N/A'

        return (
          <Space direction='vertical' style={{ width: '100%' }}>
            <Tooltip title={`Delivered: ${stats.delivered}/${stats.totalTargetUsers}`}>
              <Progress
                percent={stats.deliveredPercent}
                size='small'
                status='success'
                showInfo={false}
              />
            </Tooltip>
            <Space>
              <Typography.Text>{stats.deliveredPercent}% delivered</Typography.Text>
              <Tooltip title={`Pending: ${stats.pending}/${stats.totalTargetUsers}`}>
                <Typography.Text type='warning'>{stats.pendingPercent}% pending</Typography.Text>
              </Tooltip>
              <Tooltip title={`Cancelled: ${stats.cancelled}/${stats.totalTargetUsers}`}>
                <Typography.Text type='danger'>{stats.cancelledPercent}% cancelled</Typography.Text>
              </Tooltip>
            </Space>
          </Space>
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleOpenDialog(record)}
            disabled={record.status === 'DELIVERED'}
            type='text'
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            type='text'
            danger
          />
        </Space>
      ),
    },
  ]

  const items: TabsProps['items'] = [
    {
      key: 'create',
      label: 'Create Message',
      children: (
        <Card>
          <Form form={form} layout='vertical' onFinish={handleSubmit}>
            <Form.Item
              name='message'
              label='Message'
              rules={[{ required: true, message: 'Please enter a message' }]}
            >
              <Input.TextArea rows={4} placeholder='Enter your message' />
            </Form.Item>

            <Form.Item
              name='userId'
              label='Select User (empty to send to all users)'
              tooltip="This selector returns the user's provider account ID (e.g., Twitch ID), which will be mapped to the internal user ID in the API. If left empty, the message will be sent to all users."
            >
              <UserSelector placeholder='Search for a user' />
            </Form.Item>

            <Form.Item
              name='scheduledDate'
              label='Scheduled Date (defaults to now)'
              initialValue={dayjs()}
            >
              <DatePicker
                showTime
                format='YYYY-MM-DD HH:mm:ss'
                placeholder='Select date and time'
              />
            </Form.Item>

            <Form.Item>
              <Button type='primary' htmlType='submit' block>
                Schedule Message
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
            pagination={{ pageSize: 10 }}
          />

          <Modal
            title={editingMessage ? 'Edit Scheduled Message' : 'Create Scheduled Message'}
            open={openDialog}
            onCancel={handleCloseDialog}
            footer={null}
            width={700}
          >
            <Form
              form={form}
              layout='vertical'
              onFinish={handleSubmitDialog}
              initialValues={
                editingMessage
                  ? {
                      message: editingMessage.message,
                      sendAt: editingMessage.sendAt,
                      userId: editingMessage.userId || '',
                    }
                  : {
                      message: '',
                      sendAt: new Date(),
                      userId: '',
                    }
              }
            >
              <Form.Item
                name='message'
                label='Message'
                rules={[{ required: true, message: 'Please enter a message' }]}
              >
                <Input.TextArea rows={4} placeholder='Enter your message' />
              </Form.Item>

              <Form.Item
                name='userId'
                label='Select User (empty to send to all users)'
                tooltip="This selector returns the user's provider account ID (e.g., Twitch ID), which will be mapped to the internal user ID in the API. If left empty, the message will be sent to all users."
              >
                <UserSelector placeholder='Search for a user' />
              </Form.Item>

              <Form.Item
                name='scheduledDate'
                label='Scheduled Date (Defaults to now if empty)'
                initialValue={dayjs()}
              >
                <DatePicker
                  showTime
                  format='YYYY-MM-DD HH:mm:ss'
                  placeholder='Select date and time'
                />
              </Form.Item>

              <Form.Item>
                <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button onClick={handleCloseDialog}>Cancel</Button>
                  <Button type='primary' htmlType='submit'>
                    {editingMessage ? 'Update' : 'Create'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      ),
    },
  ]

  if (!session?.user?.role || !session.user.role?.includes('admin')) {
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
  return (
    <DashboardShell
      seo={{
        title: 'Admin Panel | Dotabod Dashboard',
        description: 'Manage scheduled messages for Dotabod users.',
        canonicalUrl: 'https://dotabod.com/dashboard/admin',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export default AdminPage
