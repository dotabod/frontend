import { useTrack } from '@/lib/track'
import { captureException } from '@sentry/nextjs'
import { Select, Tooltip } from 'antd'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'

export default function ModeratedChannels() {
  const { data } = useSession()
  const [moderatedChannels, setModeratedChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const track = useTrack()

  const fetchModeratedChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/get-moderated-channels')
      const channels = await res.json()
      setModeratedChannels(channels)
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

  const options = [
    {
      value: data?.user?.name,
      label: renderOptionLabel(data?.user?.image, data?.user?.name),
    },
    ...moderatedChannels.map((channel) => ({
      value: channel.providerAccountId,
      label: renderOptionLabel(channel.image, channel.name),
    })),
  ]

  return (
    <Tooltip title="Select a channel to moderate">
      <Select
        onClick={handleOnClick}
        loading={loading}
        defaultValue={data?.user?.name}
        style={{ width: '90%' }}
        size="large"
        options={options}
      />
    </Tooltip>
  )
}
