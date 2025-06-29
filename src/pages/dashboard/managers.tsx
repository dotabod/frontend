import { Button, notification, Select, Tag } from 'antd'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import ModeratedChannels from '@/components/Dashboard/ModeratedChannels'
import { useSubscription } from '@/hooks/useSubscription'
import { fetcher } from '@/lib/fetcher'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import { canAccessFeature } from '@/utils/subscription'

const ModeratorsPage = () => {
  const track = useTrack()
  const session = useSession()
  const { subscription } = useSubscription()
  const tierAccess = canAccessFeature('managers', subscription)

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

  // Fetch moderated channels to determine if user is a mod
  const { data: moderatedChannels, isLoading: loadingModeratedChannels } = useSWR<
    {
      providerAccountId: string
      name: string
      image: string
    }[]
  >('/api/get-moderated-channels', fetcher)

  const [loading, setLoading] = useState<boolean>(false) // Loading state
  const [selectedModerators, setSelectedModerators] = useState<string[]>([]) // Selected moderators

  useEffect(() => {
    if (!loadingApprovedMods && Array.isArray(approvedMods)) {
      setSelectedModerators(approvedMods?.map((mod) => `${mod.moderatorChannelId}`) || [])
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
        description: 'Managers updated successfully!',
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

  // If user is impersonating, return null (this is handled by the parent component)
  if (session?.data?.user?.isImpersonating) {
    return null
  }

  // Helper function to determine user role for UI display
  const getUserRoleTag = () => {
    if (session?.data?.user?.isImpersonating) {
      return <Tag color='green'>You are managing as a Mod</Tag>
    }
    return null
  }

  // Helper function to get appropriate subtitle based on user role
  const getSubtitleText = () => {
    if (session?.data?.user?.isImpersonating) {
      return "You are currently managing a streamer's dashboard."
    }
    return 'Below is a list of moderators for your channel. You can approve them to manage your Dotabod settings.'
  }

  return (
    <>
      <Head>
        <title>Dotabod | Managers</title>
      </Head>
      <Header
        subtitle={
          <div className='flex items-center gap-2'>
            <span>{getSubtitleText()}</span>
            {getUserRoleTag()}
          </div>
        }
        title='Managers'
      />

      {/* Show the mod card for mods who haven't selected a streamer yet */}
      {!session?.data?.user?.isImpersonating && (
        <Card
          title={
            <div className='flex items-center gap-2'>
              Manage a streamer <Tag color='green'>For Mods</Tag>
            </div>
          }
        >
          <p>
            Select a streamer to manage. Only streamers with an active Dotabod subscription can be
            managed.
          </p>
          <ModeratedChannels />
        </Card>
      )}

      {/* Only show the approve managers card for streamers */}
      {!session?.data?.user?.isImpersonating && (
        <Card
          title={
            <div className='flex items-center gap-2'>
              Approve Managers <Tag color='red'>For Streamer</Tag>
            </div>
          }
          feature='managers'
        >
          <div className='subtitle'>
            <p>
              By approving a user, you're allowing them to access and modify your Dotabod dashboard.
              Approved managers can manage features, toggle commands, and update settings on your
              behalf.
            </p>
            <p>
              Note: They will not have access to your setup page, downloading the GSI cfg, nor
              overlay URL.
            </p>
          </div>

          <div className='max-w-sm flex flex-col gap-4'>
            <Select
              disabled={!tierAccess.hasAccess}
              optionFilterProp='label'
              loading={loadingModList || loadingApprovedMods}
              mode='multiple'
              style={{ width: '100%' }}
              placeholder='Select moderators'
              value={selectedModerators}
              defaultValue={
                Array.isArray(approvedMods) &&
                approvedMods.map((mod) => `${mod.moderatorChannelId}`)
              }
              onChange={(value: string[] | false) => {
                if (Array.isArray(value)) {
                  setSelectedModerators(value)
                }
              }}
              options={
                Array.isArray(moderatorList)
                  ? moderatorList.map((moderator) => ({
                      label: moderator.user_name,
                      value: moderator.user_id,
                      disabled: moderator.user_id === '843245458',
                    }))
                  : []
              }
            />
            <Button
              type='primary'
              onClick={handleApprove}
              loading={loading}
              disabled={!tierAccess.hasAccess}
            >
              Submit
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className='title'>
          <h3>What is this?</h3>
        </div>
        <div className=''>
          <p className='mb-4'>
            <Tag color='red'>For Streamer</Tag> Once you approve a user, they will login to
            dotabod.com and be able to access your dashboard by using the selectbox at the top of
            this page. Approved managers can view and modify your settings, commands, and other
            dashboard features. This is useful for streamers who want to delegate some of their
            Dotabod management to trusted moderators or team members. You can revoke access at any
            time by removing them from the approved list above.
          </p>
          <p className='mb-4'>
            <Tag color='blue'>For Mods</Tag> As a mod, you can manage streamers who have approved
            you. Use the selector above to choose which streamer's dashboard you want to manage.
          </p>
          <p>
            <Tag color='green'>For Managing Mods</Tag> When managing a streamer's account, you'll
            see a badge indicating you're accessing the streamer's account, and any changes you make
            will be applied to the streamer's Dotabod configuration.
          </p>
        </div>
      </Card>
    </>
  )
}

ModeratorsPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Managers | Dotabod Dashboard',
        description: 'Manage moderators and channel managers for your Dotabod account.',
        canonicalUrl: 'https://dotabod.com/dashboard/managers',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export default ModeratorsPage
