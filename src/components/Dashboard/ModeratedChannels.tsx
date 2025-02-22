import { useSubscription } from '@/hooks/useSubscription'
import { useTrack } from '@/lib/track'
import { SUBSCRIPTION_TIERS } from '@/utils/subscription'
import { captureException } from '@sentry/nextjs'
import { Button, Select, Spin, Tag, Tooltip } from 'antd'
import { StopCircleIcon } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { plans } from '../Billing/BillingPlans'
import Link from 'next/link'

export default function ModeratedChannels() {
  const { data } = useSession()
  const user = data?.user
  const [moderatedChannels, setModeratedChannels] = useState<
    {
      providerAccountId: string
      name: string
      image: string
    }[]
  >([])
  const { subscription } = useSubscription()
  const [loading, setLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const track = useTrack()

  const [fetching, setFetching] = useState(false)
  const [options, setOptions] = useState<
    { value: string; label: string; image: string }[]
  >([])
  const fetchRef = useRef(0)

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

  const fetchOptions = useCallback(async (value: string) => {
    const res = await fetch(`/api/get-moderated-channels?search=${value}`)
    const channels = await res.json()
    return channels
  }, [])

  const debounceFetcher = useDebouncedCallback((value: string) => {
    fetchRef.current += 1
    const fetchId = fetchRef.current
    setOptions([])
    setFetching(true)

    if (!value?.trim()) {
      return
    }

    fetchOptions(value).then((newOptions) => {
      if (fetchId !== fetchRef.current) {
        // for fetch callback order
        return
      }

      if (Array.isArray(newOptions)) {
        setOptions(newOptions)
      }
      setFetching(false)
    })
  }, 300)

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

  const currentPlan = plans.find(
    (plan) => plan.name.toLowerCase() === subscription?.tier
  )

  const allOptions = [
    {
      value: `${user?.twitchId}`,
      label: renderOptionLabel(user?.image, user?.name),
      name: user?.name,
    },
    ...moderatedChannels.map((channel) => ({
      name: channel.name,
      value: channel.providerAccountId,
      label: renderOptionLabel(channel.image, channel.name),
    })),
    ...options.map((option) => ({
      value: option.value,
      name: option.label,
      label: renderOptionLabel(option.image, option.label),
    })),
  ]

  const fullOptions = allOptions.filter(
    (option, index, self) =>
      index === self.findIndex((o) => o.name === option.name)
  )

  return (
    <div className="flex flex-col flex-grow items-center moderated-channels">
      {!user?.isImpersonating && (
        <div className="mb-2 flex items-center gap-2">
          <Link href="/dashboard/billing">
            <Tag
              color={
                subscription?.tier === SUBSCRIPTION_TIERS.PRO
                  ? 'purple'
                  : subscription?.tier === SUBSCRIPTION_TIERS.STARTER
                    ? 'cyan'
                    : 'default'
              }
            >
              <div className="flex items-center gap-2">
                {currentPlan?.logo}
                {currentPlan?.name} Plan
              </div>
            </Tag>
          </Link>
        </div>
      )}
      <Tooltip title="Select a streamer account to manage" placement="right">
        <Select
          onClick={handleOnClick}
          optionFilterProp="name"
          showSearch={user?.role === 'admin'}
          onChange={handleOnChange}
          onSearch={debounceFetcher}
          notFoundContent={fetching ? <Spin size="small" /> : null}
          labelRender={() => renderOptionLabel(user?.image, user?.name)}
          loading={loading}
          defaultValue={user?.name}
          style={{ width: '90%' }}
          size="large"
          options={fullOptions}
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
