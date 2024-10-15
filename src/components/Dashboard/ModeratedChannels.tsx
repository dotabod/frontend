import { useTrack } from '@/lib/track'
import { captureException } from '@sentry/nextjs'
import { Button, Select, Tooltip } from 'antd'
import { StopCircleIcon } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'

export default function ModeratedChannels() {
  const {
    data: { user },
  } = useSession()
  const [moderatedChannels, setModeratedChannels] = useState<
    {
      providerAccountId: string
      name: string
      image: string
    }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const track = useTrack()

  const fetchModeratedChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/get-moderated-channels')
      const channels = await res.json()
      if (Array.isArray(channels)) {
        setModeratedChannels(channels)
      }
    } catch (error) {
      captureException(error)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModeratedChannels()
  }, [fetchModeratedChannels])

  const handleOnClick = useCallback(() => {
    track('selected_moderated_channel')
  }, [track])

  const renderOptionLabel = (imageSrc, name) => (
    <div className="flex flex-row items-center gap-2">
      <img
        alt="User Profile"
        width={30}
        height={30}
        className="rounded-full flex"
        onError={(e) => {
          e.currentTarget.src = '/images/hero/default.png'
        }}
        src={imageSrc || '/images/hero/default.png'}
      />
      <span>{name}</span>
    </div>
  )

  const handleOnChange = useCallback(
    (value) => {
      if (value === user?.twitchId) {
        return
      }
      setLoading(true)
      track('changed_moderated_channel')

      signIn('impersonate', {
        channelToImpersonate: value,
        callbackUrl: '/dashboard/features',
      })
    },
    [user, track]
  )

  const handleSignOut = useCallback(() => {
    setIsSigningOut(true)
    signOut()
  }, [])

  const options = [
    {
      value: user?.twitchId,
      label: renderOptionLabel(user?.image, user?.name),
    },
    ...moderatedChannels.map((channel) => ({
      value: channel.providerAccountId,
      label: renderOptionLabel(channel.image, channel.name),
    })),
  ]

  return (
    <div className="flex flex-col flex-grow items-center">
      <Tooltip title="Select a streamer account to manage">
        <Select
          onClick={handleOnClick}
          onChange={handleOnChange}
          labelRender={() => renderOptionLabel(user?.image, user.name)}
          loading={loading}
          defaultValue={user?.name}
          style={{ width: '90%' }}
          size="large"
          options={options}
        />
      </Tooltip>
      {user?.isImpersonating && (
        <Button
          onClick={handleSignOut}
          loading={isSigningOut}
          style={{ marginTop: '10px' }}
        >
          <StopCircleIcon size={16} />
          <span>Stop managing</span>
        </Button>
      )}
    </div>
  )
}
