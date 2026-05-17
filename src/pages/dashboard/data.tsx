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

const { Text, Paragraph } = Typography
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

      if (!response.ok) throw new Error("We couldn't export your data.")

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

      message.success('Your data export has been downloaded.')
    } catch (error) {
      message.error("We couldn't export your data. Try again in a moment.")
      console.error(error)
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteAccount = () => {
    track('delete_account')
    confirm({
      title: 'Delete your Dotabod account?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>This permanently:</Paragraph>
          <ul>
            <li>Erases your profile, settings, and preferences</li>
            <li>Cancels any active Dotabod subscription</li>
            <li>Deletes your saved Dota 2 match history</li>
            <li>Disconnects your Twitch and Steam accounts</li>
            <li>Invalidates your overlay URL and Dota 2 token</li>
          </ul>
          <Paragraph>You can't undo this.</Paragraph>
        </div>
      ),
      okText: 'Delete my account',
      okType: 'danger',
      cancelText: 'Keep my account',
      async onOk() {
        try {
          setLoading('delete')
          const response = await fetch('/api/manage-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete' }),
          })

          if (!response.ok) throw new Error("We couldn't delete your account.")

          message.success('Your account has been deleted. Signing you out…', 0)
          signOut({ callbackUrl: '/', redirect: true })
        } catch (error) {
          message.error("We couldn't delete your account. Try again or contact support.")
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
        <title>Dotabod | Your data</title>
      </Head>
      <Header
        subtitle='Download a copy of everything we have about your account, or delete it for good. Both are one-click and you stay in control.'
        title='Your data'
      />

      <div className='grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2'>
        <Card title={<span>Export your data</span>}>
          <Space direction='vertical' className='w-full' size='large'>
            <Text>You'll get a JSON file with:</Text>
            <ul className='list-disc pl-4 '>
              <li>Account details</li>
              <li>Settings and preferences</li>
              <li>Connected Twitch account</li>
              <li>Connected Steam accounts</li>
              <li>Saved Dota 2 match history</li>
              <li>Approved team managers</li>
            </ul>
            <Button
              key='export'
              size='large'
              onClick={handleExportData}
              loading={loading === 'export'}
              block
            >
              Download my data
            </Button>
          </Space>
        </Card>

        <Card title={<span>Delete your account</span>}>
          <div className='subtitle'>
            Permanently removes everything we have about your account. You can't undo this.
          </div>
          <Space direction='vertical' className='w-full' size='large'>
            <Text>This will:</Text>
            <ul className='list-disc pl-4'>
              <li>Erase your profile and settings</li>
              <li>Disconnect Twitch and Steam</li>
              <li>Cancel any active Dotabod subscription</li>
              <li>Delete your saved Dota 2 match history</li>
              <li>Remove approved team managers</li>
              <li>Invalidate your overlay URL and Dota 2 token</li>
              <li>Delete your Stripe customer record</li>
            </ul>
            <Button
              key='delete'
              danger
              size='large'
              onClick={handleDeleteAccount}
              loading={loading === 'delete'}
              block
            >
              Delete my account
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
        title: 'Your data | Dotabod Dashboard',
        description: 'Export a copy of your Dotabod account data, or delete your account.',
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
