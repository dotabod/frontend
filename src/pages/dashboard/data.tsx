import { ExclamationCircleOutlined } from '@ant-design/icons'
import { Button, Modal, message, Space, Typography } from 'antd'
import Head from 'next/head'
import { signOut, useSession } from 'next-auth/react'
import type { ReactElement } from 'react'
import { useState } from 'react'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'

const { Title, Text, Paragraph } = Typography
const { confirm } = Modal

const DataPage = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState<'export' | 'delete' | null>(null)
  const track = useTrack()
  if (session?.user?.isImpersonating) {
    return null
  }

  const handleExportData = async () => {
    try {
      track('export_data')
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
    track('delete_account')
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
            <li>Delete your match history</li>
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
          signOut({ callbackUrl: '/', redirect: true })
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
      <Header
        subtitle='You have the right to export or delete your personal data. Exporting data will
                download all information we have about your account. Deleting your account will
                permanently remove all your data from our servers.'
        title='Data Management'
      />

      <div className='grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2'>
        <Card title={<span>Export Your Data</span>}>
          <Space direction='vertical' className='w-full' size='large'>
            <Text>
              Download a copy of all your personal data in JSON format. This includes your:
            </Text>
            <ul className='list-disc pl-4 '>
              <li>Account information</li>
              <li>Preferences and settings</li>
              <li>Connected Twitch account</li>
              <li>Connected Steam accounts</li>
              <li>Dota 2 match history</li>
              <li>Approved managers</li>
            </ul>
            <Button
              key='export'
              size='large'
              onClick={handleExportData}
              loading={loading === 'export'}
              block
            >
              Export Data
            </Button>
          </Space>
        </Card>

        <Card title={<span>Delete Your Account</span>}>
          <div className='subtitle'>
            This action permanently removes all your data from our servers and cannot be undone.
          </div>
          <Space direction='vertical' className='w-full' size='large'>
            <Text>This will delete your:</Text>
            <ul className='list-disc pl-4'>
              <li>Personal information</li>
              <li>Twitch connection</li>
              <li>Settings</li>
              <li>Stripe customer</li>
              <li>Invalidate token for Dota 2 client</li>
              <li>Invalidate overlay URL</li>
              <li>Dota 2 match history</li>
              <li>Approved managers</li>
              <li>Steam accounts</li>
              <li>Cancel active subscriptions</li>
            </ul>
            <Button
              key='delete'
              danger
              size='large'
              onClick={handleDeleteAccount}
              loading={loading === 'delete'}
              block
            >
              Delete Account
            </Button>
          </Space>
        </Card>
      </div>
    </>
  )
}

DataPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Data | Dotabod Dashboard',
        description: 'View and manage the data associated with your Dotabod account.',
        canonicalUrl: 'https://dotabod.com/dashboard/data',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess()

export default DataPage
