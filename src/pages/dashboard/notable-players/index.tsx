import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import * as Flags from 'mantine-flagpack'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { type ReactElement, useEffect, useState } from 'react'
import { z } from 'zod'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import type { NotablePlayer } from '@/lib/db'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import type { NextPageWithLayout } from '@/pages/_app'
import { Card } from '@/ui/card'

const { Text } = Typography

// Form schema for creating/updating a notable player
const notablePlayerSchema = z.object({
  account_id: z.coerce.number().int().positive({ message: 'Account ID must be a positive number' }),
  name: z.string().min(1, { message: 'Name is required' }),
  country_code: z.string().max(3).optional(),
})

type NotablePlayerFormValues = z.infer<typeof notablePlayerSchema>

const NotablePlayersPage: NextPageWithLayout = () => {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [notablePlayers, setNotablePlayers] = useState<NotablePlayer[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()
  const [pageSize, setPageSize] = useState(10)

  // Fetch notable players on component mount
  useEffect(() => {
    fetchNotablePlayers()
  }, [])

  const fetchNotablePlayers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notable-players')
      if (!response.ok) throw new Error('Failed to fetch notable players')

      const data = await response.json()
      setNotablePlayers(data)
    } catch (error) {
      console.error('Error fetching notable players:', error)
      messageApi.error('Failed to load notable players')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    form.resetFields()
    setIsEditMode(false)
    setCurrentPlayerId(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (player: NotablePlayer) => {
    form.setFieldsValue({
      account_id: player.account_id,
      name: player.name,
      country_code: player.country_code || '',
    })
    setIsEditMode(true)
    setCurrentPlayerId(player.id)
    setIsModalOpen(true)
  }

  const handleSubmit = async (values: NotablePlayerFormValues) => {
    try {
      setIsLoading(true)

      // Validate the values with Zod
      const validatedData = notablePlayerSchema.parse(values)

      if (isEditMode && currentPlayerId) {
        // Update existing player
        const response = await fetch(`/api/notable-players/${currentPlayerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validatedData),
        })

        if (!response.ok) throw new Error('Failed to update notable player')
        messageApi.success('Player updated successfully')
      } else {
        // Create new player
        const response = await fetch('/api/notable-players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validatedData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          if (response.status === 409) {
            messageApi.error('A player with this account ID already exists')
            return
          }
          throw new Error(errorData.error || 'Failed to create notable player')
        }
        messageApi.success('Player added successfully')
      }

      setIsModalOpen(false)
      fetchNotablePlayers()
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle Zod validation errors
        for (const issue of error.issues) {
          messageApi.error(`${issue.path.join('.')}: ${issue.message}`)
        }
      } else {
        console.error('Error saving notable player:', error)
        messageApi.error('Failed to save notable player')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notable-players/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete notable player')

      messageApi.success('Player deleted successfully')
      fetchNotablePlayers()
    } catch (error) {
      console.error('Error deleting notable player:', error)
      messageApi.error('Failed to delete notable player')
    } finally {
      setIsLoading(false)
    }
  }

  const columns: ColumnsType<NotablePlayer> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Account ID',
      dataIndex: 'account_id',
      key: 'account_id',
    },
    {
      title: 'Country',
      dataIndex: 'country_code',
      key: 'country_code',
      render: (text) => {
        const FlagComp = text ? Flags[`${text.toUpperCase()}Flag`] : null
        return FlagComp ? <FlagComp w={30} radius={2} /> : '-'
      },
    },
    {
      title: 'Added By',
      dataIndex: 'addedBy',
      key: 'addedBy',
      render: (text) => {
        const name = text || session?.user?.name || '-'
        if (name === '-') return name
        return (
          <a href={`https://twitch.tv/${name}`} target='_blank' rel='noopener noreferrer'>
            {name}
          </a>
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size='small'>
          <Tooltip title='Edit player'>
            <Button
              icon={<Pencil className='h-4 w-4' />}
              type='text'
              onClick={() => handleOpenEditModal(record)}
              disabled={isLoading}
            />
          </Tooltip>
          <Popconfirm
            title='Delete player'
            description='Are you sure you want to delete this player?'
            onConfirm={() => handleDelete(record.id)}
            okText='Delete'
            cancelText='Cancel'
            okButtonProps={{ danger: true }}
          >
            <Button
              icon={<Trash2 className='h-4 w-4 text-red-500' />}
              type='text'
              disabled={isLoading}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      {contextHolder}
      <Head>
        <title>Dotabod | Notable Players Management</title>
      </Head>

      <Header
        title='Notable Players Management'
        subtitle='Manage the notable players that appear on your stream overlay and in chat when responding to the !np command.'
      />

      <p className='mb-6'>{CommandDetail.commandNP.response(null, false)}</p>

      <Card title='Your Notable Players' className='mb-6'>
        <div className='flex justify-between items-center mb-6'>
          <Button
            type='primary'
            icon={<Plus className='h-4 w-4' />}
            onClick={handleOpenAddModal}
            loading={isLoading}
          >
            Add Player
          </Button>
        </div>

        {isLoading && !notablePlayers.length ? (
          <div className='flex justify-center items-center py-12'>
            <Spin size='large' />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={notablePlayers.map((player) => ({ ...player, key: player.id }))}
            pagination={{
              pageSize,
              onShowSizeChange: (_current, size) => setPageSize(size),
              showSizeChanger: true,
              hideOnSinglePage: true,
              position: ['bottomCenter'],
            }}
            bordered
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='No notable players found'>
                  <Button
                    type='primary'
                    onClick={handleOpenAddModal}
                    icon={<Plus className='h-4 w-4' />}
                  >
                    Add Your First Player
                  </Button>
                </Empty>
              ),
            }}
          />
        )}
      </Card>

      <Modal
        title={isEditMode ? 'Edit Notable Player' : 'Add Notable Player'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          className='mt-4'
          initialValues={{
            fantasy_role: 0,
            is_pro: false,
          }}
        >
          <Form.Item
            name='account_id'
            label='Account ID*'
            rules={[{ required: true, message: 'Account ID is required' }]}
          >
            <Input type='number' placeholder='Enter Dota 2 account ID' disabled={isEditMode} />
          </Form.Item>

          <Form.Item
            name='name'
            label='Player Name*'
            rules={[{ required: true, message: 'Player name is required' }]}
          >
            <Input placeholder='Enter player name' />
          </Form.Item>

          <Form.Item
            name='country_code'
            label='Country Code'
            help={
              <div>
                <Text type='secondary'>
                  Enter the 2-letter ISO country code (e.g., us, ru, cn). This will display the
                  country flag next to the player's name.
                  <a
                    href='https://www.iban.com/country-codes'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='ml-1'
                  >
                    View all country codes
                  </a>
                </Text>
              </div>
            }
          >
            <Input placeholder='e.g. us, ru, cn' />
          </Form.Item>

          <div className='flex justify-end gap-4 pt-4'>
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type='primary' htmlType='submit' loading={isLoading}>
              {isEditMode ? 'Update Player' : 'Add Player'}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  )
}

NotablePlayersPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Notable Players | Dotabod Dashboard',
        description: 'Manage notable players for your Dota 2 streams.',
        canonicalUrl: 'https://dotabod.com/dashboard/notable-players',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess()

export default NotablePlayersPage
