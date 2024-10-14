import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { fetcher } from '@/lib/fetcher'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import { Button, Select, notification } from 'antd'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

const ModeratorsPage = () => {
  const track = useTrack()
  const {
    data: approvedMods,
    isLoading: loadingApprovedMods,
    mutate,
  } = useSWR<
    {
      moderatorChannelId: number
      createdAt: string
    }[]
  >('/api/get-approved-moderators', fetcher)
  const { data: moderatorList, isLoading: loadingModList } = useSWR<
    {
      user_id: string
      user_login: string
      user_name: string
    }[]
  >('/api/get-moderators', fetcher)

  const [loading, setLoading] = useState<boolean>(false) // Loading state
  const [selectedModerators, setSelectedModerators] = useState<string[]>([]) // Selected moderators

  useEffect(() => {
    if (!loadingApprovedMods && Array.isArray(approvedMods)) {
      setSelectedModerators(
        approvedMods?.map((mod) => `${mod.moderatorChannelId}`) || []
      )
    }
  }, [approvedMods, loadingApprovedMods])

  const handleApprove = async () => {
    setLoading(true) // Set loading state
    track('approve_moderators_start')

    try {
      const data = await fetch('/api/approve-moderator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moderatorChannelIds: selectedModerators,
        }),
      })
      const body = await data.json()
      if (body?.error) {
        throw new Error(body?.message)
      }
      // Re-fetch approved moderators
      mutate()
      notification.success({
        message: 'Success',
        description: 'Moderators updated successfully!',
      })
      track('approve_moderators_success')
    } catch (error) {
      console.error('Failed to approve moderators:', error)
      notification.error({
        message: 'Error',
        description: 'Failed to approve moderators.',
      })
      track('approve_moderators_failure', { error: error.message })
    } finally {
      setLoading(false)
      setSelectedModerators([])
    }
  }

  return (
    <>
      <Head>
        <title>Dotabod | Moderators</title>
      </Head>
      <Header
        subtitle="A list of all moderators for your channel. You can approve them to modify your Dotabod settings."
        title="Moderators"
      />

      <Card>
        <div className="title">
          <h3>Approve list</h3>
        </div>
        <div className="subtitle">
          Approved moderators will have the ability to change any of your
          Dotabod settings on your behalf. They can toggle commands, change
          features, and more. They will not be able to see the Setup screen or
          view your overlay URL.
        </div>

        <div className="max-w-sm flex flex-col gap-4">
          <Select
            optionFilterProp="label"
            loading={loadingModList || loadingApprovedMods}
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select moderators"
            value={selectedModerators}
            defaultValue={
              Array.isArray(approvedMods) &&
              approvedMods.map((mod) => `${mod.moderatorChannelId}`)
            }
            onChange={setSelectedModerators}
            options={
              Array.isArray(moderatorList) &&
              moderatorList
                ?.filter(
                  (m) =>
                    Number(m.user_id) !==
                    Number(process.env.TWITCH_BOT_PROVIDERID)
                )
                .map((moderator) => ({
                  label: moderator.user_name,
                  value: moderator.user_id,
                }))
            }
          />
          <Button type="primary" onClick={handleApprove} loading={loading}>
            Submit
          </Button>
        </div>
      </Card>
    </>
  )
}

ModeratorsPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default ModeratorsPage
