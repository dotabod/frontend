import { useTrack } from '@/lib/track'
import { captureException } from '@sentry/nextjs'
import { Select, Tooltip } from 'antd'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function ModeratedChannelsSelect() {
  const { data } = useSession()
  const [moderatedChannels, setModeratedChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const track = useTrack()

  useEffect(() => {
    fetch('/api/get-moderated-channels')
      .then((res) => res.json())
      .then((data) => {
        setModeratedChannels(data)
        setLoading(false)
      })
      .catch((error) => {
        captureException(error)
        console.error(error)
        setLoading(false)
      })
  }, [])

  return (
    <Tooltip title="Select a channel to moderate">
      <Select
        onClick={() => {
          track('selected_moderated_channel')
        }}
        loading={loading}
        defaultValue={data?.user?.name}
        style={{ width: '90%' }}
        size="large"
        options={[
          {
            value: data?.user?.name,
            label: (
              <div className="flex flex-row items-center gap-2">
                <img
                  alt="User Profile"
                  width={30}
                  height={30}
                  className="rounded-full flex"
                  onError={(e) => {
                    e.currentTarget.src = '/images/hero/default.png'
                  }}
                  src={data?.user?.image || '/images/hero/default.png'}
                />
                <span>{data?.user?.name}</span>
              </div>
            ),
          },
          ...moderatedChannels.map((channel) => ({
            value: channel.providerAccountId,
            label: (
              <div className="flex flex-row items-center gap-2">
                <img
                  alt="User Profile"
                  width={30}
                  height={30}
                  className="rounded-full flex"
                  onError={(e) => {
                    e.currentTarget.src = '/images/hero/default.png'
                  }}
                  src={channel.image || '/images/hero/default.png'}
                />
                <span>{channel.name}</span>
              </div>
            ),
          })),
        ]}
      />
    </Tooltip>
  )
}
