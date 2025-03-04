import DashboardShell from '@/components/Dashboard/DashboardShell'
import UserSelector from '@/components/Dashboard/UserSelector'
import { Card } from '@/ui/card'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { ScheduledMessage } from '@prisma/client'
import type { TabsProps } from 'antd'
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Progress,
  Radio,
  Space,
  Table,
  Tabs,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { format } from 'date-fns'
import type dayjs from 'dayjs'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const { Title } = Typography
const { TextArea } = Input

interface FormValues {
  message: string
  messageType?: 'when_online' | 'scheduled'
  scheduledDate?: dayjs.Dayjs
  sendAt: string | dayjs.Dayjs | Date
  userId?: string
  isForAllUsers: boolean
}

const AdminPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [messageType, setMessageType] = useState<'when_online' | 'scheduled'>('when_online')
  const [form] = Form.useForm()
  const [openDialog, setOpenDialog] = useState(false)
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.role || !session.user.role.includes('admin')) {
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
    console.log('Form values submitted:', values)
    if (!values.message.trim()) {
      message.error('Message cannot be empty')
      return
    }

    // Validate userId if not sending to all users
    if (!values.isForAllUsers && !values.userId) {
      message.error('Please select a user')
      return
    }

    setLoading(true)
    try {
      const payload = {
        message: values.message,
        isForAllUsers: values.isForAllUsers || false,
        userId: values.isForAllUsers ? null : values.userId,
        sendAt:
          values.messageType === 'scheduled' && values.scheduledDate
            ? values.scheduledDate.format('YYYY-MM-DDTHH:mm:ss')
            : new Date().toISOString(), // Default to now if not scheduled
      }

      console.log('Payload being sent:', payload)

      const response = await fetch('/api/admin/scheduled-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

  const handleOpenDialog = (message: ScheduledMessage | null) => {
    if (message) {
      setEditingMessage(message)
      form.setFieldsValue({
        message: message.message,
        sendAt: message.sendAt,
        userId: message.userId || '',
        isForAllUsers: message.isForAllUsers,
      })
    } else {
      setEditingMessage(null)
      form.setFieldsValue({
        message: '',
        sendAt: new Date(), // Default to now
        userId: '',
        isForAllUsers: false,
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
      console.log('Dialog form values:', values)

      // Validate userId if not sending to all users
      if (!values.isForAllUsers && !values.userId) {
        message.error('Please select a user')
        return
      }

      const formData = {
        message: values.message,
        isForAllUsers: values.isForAllUsers || false,
        userId: values.isForAllUsers ? null : values.userId,
        sendAt: values.sendAt,
      }

      console.log('Dialog payload being sent:', formData)

      if (editingMessage) {
        // Update existing message
        await fetch(`/api/admin/scheduled-messages/${editingMessage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        // Create new message
        await fetch('/api/admin/scheduled-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }

      message.success(`Message ${editingMessage ? 'updated' : 'created'} successfully`)
      handleCloseDialog()
      fetchMessages()
    } catch (error) {
      console.error('Error saving scheduled message:', error)
      message.error('Failed to save message')
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
              help='Use [username] to include the users name'
              rules={[{ required: true, message: 'Please enter a message' }]}
            >
              <TextArea rows={4} placeholder='Enter your message here...' />
            </Form.Item>

            <Form.Item name='isForAllUsers' valuePropName='checked'>
              <Checkbox>Send to all users</Checkbox>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.isForAllUsers !== currentValues.isForAllUsers
              }
            >
              {({ getFieldValue }) =>
                !getFieldValue('isForAllUsers') ? (
                  <Form.Item
                    name='userId'
                    label='Select User'
                    rules={[{ required: true, message: 'Please select a user' }]}
                    tooltip="This selector returns the user's provider account ID (e.g., Twitch ID), which will be mapped to the internal user ID in the API."
                  >
                    <UserSelector placeholder='Search for a user' />
                  </Form.Item>
                ) : null
              }
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
                      isForAllUsers: editingMessage.isForAllUsers,
                    }
                  : {
                      message: '',
                      sendAt: new Date(),
                      userId: '',
                      isForAllUsers: false,
                    }
              }
            >
              <Form.Item
                name='message'
                label='Message'
                rules={[{ required: true, message: 'Please enter a message' }]}
              >
                <Input.TextArea rows={4} />
              </Form.Item>

              <Form.Item
                name='sendAt'
                label='Send At'
                rules={[{ required: true, message: 'Please select a date and time' }]}
              >
                <DatePicker showTime />
              </Form.Item>

              <Form.Item name='isForAllUsers' valuePropName='checked'>
                <Checkbox>Send to all users</Checkbox>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.isForAllUsers !== currentValues.isForAllUsers
                }
              >
                {({ getFieldValue }) =>
                  !getFieldValue('isForAllUsers') ? (
                    <Form.Item
                      name='userId'
                      label='Select User'
                      rules={[{ required: true, message: 'Please select a user' }]}
                      tooltip="This selector returns the user's provider account ID (e.g., Twitch ID), which will be mapped to the internal user ID in the API."
                    >
                      <UserSelector placeholder='Search for a user' />
                    </Form.Item>
                  ) : null
                }
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
