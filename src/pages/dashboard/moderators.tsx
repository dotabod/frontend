import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { fetcher } from '@/lib/fetcher'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import { Button, notification } from 'antd'
import { ExternalLinkIcon, Trash } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState } from 'react'
import useSWR from 'swr'

const ModeratorsPage = () => {
  const track = useTrack()
  const { data: approvedMods, mutate } = useSWR<
    {
      moderatorChannelId: string
      createdAt: string
    }[]
  >('/api/get-approved-moderators', fetcher)
  const session = useSession()
  const { data: moderatorList } = useSWR<
    {
      user_id: string
      user_login: string
      user_name: string
    }[]
  >('/api/get-moderators', fetcher)

  const [loading, setLoading] = useState<string | null>(null) // Loading state

  const handleApprove = async (
    moderatorChannelId: string,
    isModeratorApproved: boolean
  ) => {
    setLoading(moderatorChannelId) // Set loading state

    try {
      const data = await fetch('/api/approve-moderator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isModeratorApproved,
          moderatorChannelId,
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
        description: isModeratorApproved
          ? 'Moderator removed successfully!'
          : 'Moderator approved successfully!',
      })
    } catch (error) {
      console.error('Failed to approve moderator:', error)
      notification.error({
        message: 'Error',
        description: 'Failed to approve moderator.',
      })
    } finally {
      setLoading(null) // Reset loading state
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2">
        {moderatorList?.map((moderator) => {
          const isModeratorApproved = !!approvedMods?.find(
            (mod) => mod.moderatorChannelId === moderator.user_id
          )
          return (
            <div key={moderator.user_id}>
              <Card>
                <div className="title">
                  <h3>
                    <Button
                      iconPosition="end"
                      className="!pl-0"
                      type="link"
                      size="large"
                      icon={<ExternalLinkIcon size={14} />}
                      onClick={() => {
                        track('Twitch Viewercard', {
                          user: session?.data?.user?.name,
                          target: moderator.user_login,
                        })
                        window.open(
                          `https://www.twitch.tv/popout/${session?.data?.user?.name}/viewercard/${moderator.user_login}?popout=`,
                          'mywindow',
                          'menubar=1,resizable=1,width=350,height=550'
                        )
                      }}
                      target="_blank"
                    >
                      {moderator.user_name}
                    </Button>
                  </h3>
                </div>

                <div className="flex items-center space-x-4">
                  <Button
                    icon={isModeratorApproved ? <Trash size={16} /> : undefined}
                    color={isModeratorApproved ? 'danger' : 'primary'}
                    type={isModeratorApproved ? 'default' : 'primary'}
                    onClick={() =>
                      handleApprove(moderator.user_id, isModeratorApproved)
                    }
                    loading={loading === moderator.user_id} // Loading state for the specific button
                  >
                    {isModeratorApproved ? 'Remove' : 'Approve'}
                  </Button>
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </>
  )
}

ModeratorsPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default ModeratorsPage
