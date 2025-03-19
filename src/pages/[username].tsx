import CommandDetail from '@/components/Dashboard/CommandDetail'
import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { useGetSettingsByUsername } from '@/lib/hooks/useUpdateSetting'
import { getValueOrDefault } from '@/lib/settings'
import type { NextPageWithLayout } from '@/pages/_app'
import { Button, Empty, Input, Segmented, Skeleton, Tag, Tooltip } from 'antd'
import { CrownIcon, ExternalLinkIcon, GiftIcon } from 'lucide-react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect, useState } from 'react'
import { createGiftLink } from '@/utils/gift-links'

const CommandsPage: NextPageWithLayout = () => {
  const [permission, setPermission] = useState('All')
  const [enabled, setEnabled] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    isPro: boolean
    isLifetime: boolean
    isGracePeriodPro: boolean
    inGracePeriod: boolean
    loading: boolean
  }>({
    isPro: false,
    isLifetime: false,
    isGracePeriodPro: false,
    inGracePeriod: false,
    loading: true,
  })
  const router = useRouter()
  const { username } = router.query
  const { data, loading, error, notFound } = useGetSettingsByUsername()

  // Fetch subscription information
  useEffect(() => {
    if (username && typeof username === 'string') {
      fetch(`/api/subscription/by-username?username=${username}`)
        .then((res) => res.json())
        .then((data) => {
          setSubscriptionInfo({
            isPro: data.isPro || false,
            isLifetime: data.isLifetime || false,
            isGracePeriodPro: data.isGracePeriodPro || false,
            inGracePeriod: data.inGracePeriod || false,
            loading: false,
          })
        })
        .catch(() => {
          setSubscriptionInfo({
            isPro: false,
            isLifetime: false,
            isGracePeriodPro: false,
            inGracePeriod: false,
            loading: false,
          })
        })
    }
  }, [username])

  useEffect(() => {
    // Only redirect to 404 if username exists in query and we've finished loading
    if (username && !loading && (notFound || data?.error || error)) {
      router.push('/404')
    }
  }, [data, loading, router, notFound, error, username])

  if (loading || error || !data) {
    return (
      <div className='p-6'>
        <div className='mb-12 space-y-4'>
          <div className='flex flex-row items-center space-x-2'>
            <Skeleton.Avatar active size={80} shape='circle' />
            <div className='flex-grow'>
              <div className='flex flex-row items-center space-x-4'>
                <Skeleton.Button active size='large' shape='round' />
                <Skeleton.Button active size='small' shape='round' style={{ width: 60 }} />
              </div>
              <Skeleton.Input active size='small' style={{ width: 200, marginTop: 8 }} />
            </div>
            <div>
              <div className='flex space-x-2'>
                <Skeleton.Button active size='default' shape='default' style={{ width: 140 }} />
                <Skeleton.Button active size='default' shape='default' style={{ width: 160 }} />
              </div>
            </div>
          </div>
          <Skeleton active paragraph={{ rows: 1 }} />
        </div>

        <div className='flex items-baseline sm:gap-6 gap-2 max-w-full flex-wrap mb-4'>
          <Skeleton.Button active size='default' shape='default' style={{ width: 200 }} />
          <Skeleton.Button active size='default' shape='default' style={{ width: 200 }} />
          <Skeleton.Input active size='default' style={{ width: 300 }} />
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 mb-10'>
          {['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6', 'sk7', 'sk8'].map((key) => (
            <div key={key} className='border border-gray-700 rounded-lg p-4'>
              <Skeleton active paragraph={{ rows: 3 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const commands = data?.settings
    ? Object.keys(CommandDetail).map((command) => {
        const isEnabled = getValueOrDefault(CommandDetail[command].key, data?.settings)
        return { command, isEnabled: !!isEnabled }
      })
    : []

  const filteredCommands = Object.keys(CommandDetail)
    .filter((command) => {
      const isEnabled = getValueOrDefault(CommandDetail[command].key, data?.settings)
      if (enabled === 'Enabled') return isEnabled === true
      if (enabled === 'Disabled') return isEnabled === false
      return true
    })
    .filter((command) => {
      if (permission === 'Mods') return CommandDetail[command].allowed === 'mods'
      if (permission === 'Plebs') return CommandDetail[command].allowed === 'all'
      return true
    })
    .filter((command) => {
      const keysToSearch = ['alias', 'title', 'description', 'cmd']
      return keysToSearch.some((key) => {
        const value = CommandDetail[command][key]
        if (Array.isArray(value)) {
          return value.some(
            (alias) =>
              alias.toLowerCase().includes(searchTerm) ||
              `!${alias.toLowerCase()}`.includes(searchTerm),
          )
        }
        return value.toLowerCase().includes(searchTerm)
      })
    })

  // Determine what subscription badge to show
  const getSubscriptionBadge = () => {
    if (subscriptionInfo.loading) return null
    if (subscriptionInfo.isPro) {
      if (subscriptionInfo.isGracePeriodPro) {
        return (
          <Tooltip title='Using Pro features during free trial period'>
            <Tag color='blue' className='flex! gap-1 items-center py-0.5'>
              <CrownIcon size={14} className='inline-block flex-shrink-0' />
              <span>Free Trial</span>
            </Tag>
          </Tooltip>
        )
      }

      if (subscriptionInfo.isLifetime) {
        return (
          <Tooltip title='Lifetime Pro Subscriber'>
            <Tag color='gold' className='flex! gap-1 items-center py-0.5'>
              <CrownIcon size={14} className='inline-block flex-shrink-0' />
              <span>Lifetime Pro</span>
            </Tag>
          </Tooltip>
        )
      }

      return (
        <Tooltip title='Pro Subscriber'>
          <Tag color='gold' className='flex! gap-1 items-center py-0.5'>
            <CrownIcon size={14} className='inline-block flex-shrink-0' />
            <span>Pro</span>
          </Tag>
        </Tooltip>
      )
    }

    return null
  }

  return (
    <>
      <Head>
        <title>{`Commands for ${loading || !data?.displayName ? '...' : data.displayName} - Dotabod`}</title>
        <meta
          name='description'
          content='An exhaustive list of all commands available using Twitch chat.'
        />
        {username && typeof username === 'string' && (
          <link rel='canonical' href={`https://dotabod.com/${username}`} />
        )}
        <meta
          name='robots'
          content={username === '[username]' ? 'noindex, nofollow' : 'index, follow'}
        />
      </Head>
      <div className='p-6'>
        <div className='mb-12 space-y-4'>
          <div className='flex flex-row items-center space-x-2'>
            <Image
              onError={(e) => {
                e.currentTarget.src = '/images/hero/default.png'
              }}
              src={data?.image || '/images/hero/default.png'}
              alt='Profile Picture'
              width={80}
              height={80}
              className='rounded-full flex'
            />
            <div className='flex-grow'>
              <div className='flex flex-wrap gap-2 flex-row items-center space-x-4'>
                <Link
                  target='_blank'
                  href={!loading && data ? `https://twitch.tv/${data?.name}` : ''}
                  passHref
                  className='flex flex-row items-center space-x-2'
                >
                  <h1 className='text-2xl font-bold leading-6'>
                    {loading || !data?.displayName ? 'Loading...' : data.displayName}
                  </h1>
                  <ExternalLinkIcon className='flex' size={15} />
                </Link>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs ${data?.stream_online ? 'bg-red-700' : 'bg-gray-700'}`}
                >
                  {data?.stream_online ? 'Live' : 'Offline'}
                </span>
                {getSubscriptionBadge()}
              </div>
              <span>
                Using Dotabod since{' '}
                {loading || !data?.createdAt
                  ? '...'
                  : new Date(data.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <div className='flex flex-wrap gap-2'>
                <Link
                  target='_blank'
                  href={!loading && data ? `https://twitch.tv/${data?.name}` : ''}
                  passHref
                >
                  <Button icon={<ExternalLinkIcon size={16} />} className='flex items-center'>
                    View on Twitch
                  </Button>
                </Link>
                <Link href={createGiftLink(username as string)} passHref>
                  <Button
                    type='primary'
                    icon={<GiftIcon size={16} />}
                    className='flex items-center'
                  >
                    Gift Subscription
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <div className='text-gray-300'>
            All commands available to use in Twitch chat with Dotabod.
          </div>
        </div>
        <div className='flex items-baseline sm:gap-6 gap-2 max-w-full flex-wrap mb-4'>
          <Segmented
            value={enabled}
            onChange={(v) => setEnabled(v as string)}
            options={['All', 'Enabled', 'Disabled']}
          />
          <Segmented
            value={permission}
            onChange={(v) => setPermission(v as string)}
            options={['All', 'Mods', 'Plebs']}
          />
          <Input
            placeholder='Search commands...'
            value={searchTerm}
            maxLength={200}
            style={{ width: 300 }}
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          />
        </div>
        {filteredCommands.length < 1 && (
          <Empty description='Could not find any matching commands.' imageStyle={{ height: 60 }} />
        )}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 mb-10'>
          {filteredCommands.map((key) => (
            <CommandsCard
              readonly
              key={key}
              id={key}
              publicLoading={loading}
              publicIsEnabled={commands.find((c) => c.command === key)?.isEnabled}
              command={CommandDetail[key]}
            />
          ))}
        </div>
      </div>
    </>
  )
}

CommandsPage.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell dontUseTitle>{page}</HomepageShell>
}

export default CommandsPage
