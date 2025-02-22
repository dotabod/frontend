import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { Card } from '@/ui/card'
import {
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Button, Col, Divider, Modal, Row, Space, Typography, message } from 'antd'
import { signOut, useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState } from 'react'

const { Title, Text, Paragraph } = Typography
const { confirm } = Modal

const DataPage = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState<'export' | 'delete' | null>(null)

  if (session?.user?.isImpersonating) {
    return null
  }

  const handleExportData = async () => {
    try {
      setLoading('export')
      const response = await fetch('/api/manage-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      })

      if (!response.ok) throw new Error('Failed to export data')

      const data = await response.json()

      // Create and download file
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dotabod-data.json'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      message.success('Data exported successfully')
    } catch (error) {
      message.error('Failed to export data')
      console.error(error)
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteAccount = () => {
    confirm({
      title: 'Are you sure you want to delete your account?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>This action cannot be undone. This will:</Paragraph>
          <ul>
            <li>Delete all your personal information</li>
            <li>Remove all your settings and preferences</li>
            <li>Cancel any active subscriptions</li>
            <li>Delete your betting history</li>
            <li>Remove all connected accounts</li>
          </ul>
        </div>
      ),
      okText: 'Yes, delete my account',
      okType: 'danger',
      cancelText: 'No, keep my account',
      async onOk() {
        try {
          setLoading('delete')
          const response = await fetch('/api/manage-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete' }),
          })

          if (!response.ok) throw new Error('Failed to delete account')

          message.success('Account deleted successfully', 0)
          signOut({ callbackUrl: '/' })
        } catch (error) {
          message.error('Failed to delete account')
          console.error(error)
        } finally {
          setLoading(null)
        }
      },
    })
  }

  if (!session) {
    return null
  }

  if (session.user.isImpersonating) {
    return null
  }

  return (
    <>
      <Head>
        <title>Dotabod | Data Management</title>
      </Head>
      <Header subtitle='Manage your personal data.' title='Data Management' />

      <div className='max-w-4xl mx-auto'>
        <Card className='mb-8'>
          <Space className='w-full' align='start'>
            <InfoCircleOutlined className='text-blue-400 text-xl mt-1' />
            <div>
              <Title level={5} className='!mb-2 !text-blue-400'>
                Data Privacy
              </Title>
              <Text className='text-gray-300'>
                You have the right to export or delete your personal data. Exporting data will
                download all information we have about your account. Deleting your account will
                permanently remove all your data from our servers.
              </Text>
            </div>
          </Space>
        </Card>

        <Row gutter={24}>
          <Col span={12}>
            <Card
              title={
                <Space>
                  <DownloadOutlined className='text-blue-400' />
                  <span>Export Your Data</span>
                </Space>
              }
              className='h-full'
            >
              <Space direction='vertical' className='w-full' size='large'>
                <Text className='text-gray-300'>
                  Download a copy of all your personal data in JSON format. This includes your:
                </Text>
                <ul className='list-disc pl-4 text-gray-300'>
                  <li>Account information</li>
                  <li>Preferences and settings</li>
                  <li>Connected accounts</li>
                  <li>Usage history</li>
                </ul>
                <Button
                  key='export'
                  type='primary'
                  size='large'
                  icon={<DownloadOutlined />}
                  onClick={handleExportData}
                  loading={loading === 'export'}
                  block
                >
                  Export Data
                </Button>
              </Space>
            </Card>
          </Col>

          <Col span={12}>
            <Card
              title={
                <Space>
                  <DeleteOutlined className='text-red-400' />
                  <span className='text-red-400'>Delete Your Account</span>
                </Space>
              }
              className='h-full border-red-500/20'
            >
              <Space direction='vertical' className='w-full' size='large'>
                <Text type='danger'>
                  This action permanently removes all your data from our servers and cannot be
                  undone.
                </Text>
                <Divider className='my-2 border-red-500/20' />
                <Text className='text-gray-300'>This will delete your:</Text>
                <ul className='list-disc pl-4 text-red-400/80'>
                  <li>Personal information</li>
                  <li>Settings and preferences</li>
                  <li>Active subscriptions</li>
                  <li>Betting history</li>
                  <li>Connected accounts</li>
                </ul>
                <Button
                  key='delete'
                  danger
                  size='large'
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteAccount}
                  loading={loading === 'delete'}
                  block
                >
                  Delete Account
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  )
}

DataPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default DataPage
