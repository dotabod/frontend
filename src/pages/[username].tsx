import { Button, Empty, Input, Segmented, Skeleton, Tag, Tooltip } from 'antd'
import { CrownIcon, ExternalLinkIcon, GiftIcon } from 'lucide-react'
import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import HomepageShell from '@/components/Homepage/HomepageShell'
import prisma from '@/lib/db'
import { useGetSettingsByUsername } from '@/lib/hooks/useUpdateSetting'
import { getValueOrDefault } from '@/lib/settings'
import { createGiftLink } from '@/utils/gift-links'
import { getSubscription } from '@/utils/subscription'

interface PageContentProps {
  userData?: {
    displayName: string | null
    name: string
    stream_online: boolean
    image: string | null
    createdAt: string
    mmr?: number
    settings: Array<{
      key: string
      value: any
    }>
  } | null
  subscriptionInfo?: {
    isPro: boolean
    isLifetime: boolean
    isGracePeriodPro: boolean
    inGracePeriod: boolean
  }
  username?: string
}

const PageContent = ({
  userData: ssrUserData,
  subscriptionInfo: ssrSubscriptionInfo,
  username: ssrUsername,
}: PageContentProps = {}) => {
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
    isPro: ssrSubscriptionInfo?.isPro || false,
    isLifetime: ssrSubscriptionInfo?.isLifetime || false,
    isGracePeriodPro: ssrSubscriptionInfo?.isGracePeriodPro || false,
    inGracePeriod: ssrSubscriptionInfo?.inGracePeriod || false,
    loading: !ssrSubscriptionInfo,
  })
  const router = useRouter()
  const { username } = router.query
  const { data, loading, error, notFound } = useGetSettingsByUsername()

  // Use SSR data if available, otherwise fall back to client-side data
  const finalUserData = ssrUserData || data
  const _finalUsername = ssrUsername || (typeof username === 'string' ? username : '')
  const finalLoading = ssrUserData ? false : loading

  // Fetch subscription information only if we don't have SSR data
  useEffect(() => {
    if (!ssrSubscriptionInfo && username && typeof username === 'string') {
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
  }, [username, ssrSubscriptionInfo])

  useEffect(() => {
    // Only redirect to 404 if username exists in query and we've finished loading (for client-side only)
    if (!ssrUserData && username && !finalLoading && (notFound || finalUserData?.error || error)) {
      router.push('/404')
    }
  }, [finalUserData, finalLoading, router, notFound, error, username, ssrUserData])

  if (finalLoading || error || !finalUserData) {
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

  const commands = finalUserData?.settings
    ? Object.keys(CommandDetail).map((command) => {
        const isEnabled = getValueOrDefault(CommandDetail[command].key, finalUserData?.settings)
        return { command, isEnabled: !!isEnabled }
      })
    : []

  const filteredCommands = Object.keys(CommandDetail)
    .filter((command) => {
      const isEnabled = getValueOrDefault(CommandDetail[command].key, finalUserData?.settings)
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
        const value = CommandDetail[command][key] || ''
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
        <title>{`Commands for ${finalLoading || !finalUserData?.displayName ? '...' : finalUserData.displayName} - Dotabod`}</title>
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
          <div className='flex flex-row flex-wrap items-center space-x-2'>
            {/* biome-ignore lint/performance/noImgElement: Dynamic image with onError fallback, not compatible with next/image */}
            <img
              onError={(e) => {
                e.currentTarget.src = '/images/hero/default.png'
              }}
              src={data?.image || '/images/hero/default.png'}
              alt='Profile'
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
                    {finalLoading || !finalUserData?.displayName
                      ? 'Loading...'
                      : finalUserData.displayName}
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
                {finalLoading || !finalUserData?.createdAt
                  ? '...'
                  : new Date(finalUserData.createdAt).toLocaleDateString()}
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
              publicLoading={finalLoading}
              publicIsEnabled={commands.find((c) => c.command === key)?.isEnabled}
              command={CommandDetail[key]}
            />
          ))}
        </div>
      </div>
    </>
  )
}

interface UserProfileProps {
  userData: {
    displayName: string | null
    name: string
    stream_online: boolean
    image: string | null
    createdAt: string
    mmr?: number
    settings: Array<{
      key: string
      value: any
    }>
  } | null
  subscriptionInfo: {
    isPro: boolean
    isLifetime: boolean
    isGracePeriodPro: boolean
    inGracePeriod: boolean
  }
  username: string
}

const CommandsPage = ({ userData, subscriptionInfo, username }: UserProfileProps) => {
  const router = useRouter()

  // If we're in fallback mode, show loading
  if (router.isFallback) {
    return (
      <HomepageShell>
        <div className='p-6'>
          <Skeleton active />
        </div>
      </HomepageShell>
    )
  }

  // If no user data, show 404
  if (!userData) {
    return (
      <HomepageShell>
        <div className='p-6'>
          <Empty description='User not found' />
        </div>
      </HomepageShell>
    )
  }

  const pageTitle = `${userData.displayName || userData.name} - ${userData.mmr || 0} MMR | Dotabod`
  const pageDescription = `View ${userData.displayName || userData.name}'s Dota 2 commands and stream stats on Dotabod. ${userData.stream_online ? 'Currently live streaming!' : 'Stream offline.'}`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='description' content={pageDescription} />
        <meta property='og:title' content={pageTitle} />
        <meta property='og:description' content={pageDescription} />
        <meta property='og:image' content={userData.image || '/images/hero/default.png'} />
        <meta property='og:url' content={`https://dotabod.com/${username}`} />
        <meta property='twitter:card' content='summary_large_image' />
        <meta property='twitter:title' content={pageTitle} />
        <meta property='twitter:description' content={pageDescription} />
        <meta property='twitter:image' content={userData.image || '/images/hero/default.png'} />
        <link rel='canonical' href={`https://dotabod.com/${username}`} />
      </Head>
      <HomepageShell
        dontUseTitle
        ogImage={{
          title: userData.displayName || userData.name,
          subtitle: 'Commands and settings available for this streamer.',
        }}
      >
        <PageContent userData={userData} subscriptionInfo={subscriptionInfo} username={username} />
      </HomepageShell>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Pre-build only the most popular users for fastest loading
  const topUsers = await prisma.user.findMany({
    where: {
      AND: [
        { followers: { gte: 500 } }, // Higher threshold for pre-building
        { stream_online: true }, // Focus on currently active streamers
      ],
    },
    select: { name: true },
    orderBy: { followers: 'desc' },
    take: 500, // Pre-build only top 500 most popular active users
  })

  const paths = topUsers.map((user) => ({
    params: { username: user.name },
  }))

  return {
    paths,
    fallback: 'blocking', // Generate other 29,950+ pages on-demand with ISR
  }
}

export const getStaticProps: GetStaticProps<UserProfileProps> = async ({ params }) => {
  const username = params?.username as string

  if (!username) {
    return { notFound: true }
  }

  try {
    // Fetch user data
    const userData = await prisma.user.findFirst({
      select: {
        id: true,
        displayName: true,
        name: true,
        stream_online: true,
        image: true,
        createdAt: true,
        mmr: true,
        settings: {
          select: {
            key: true,
            value: true,
          },
          where: {
            key: {
              startsWith: 'command',
            },
          },
        },
      },
      where: {
        name: username.toLowerCase(),
      },
    })

    if (!userData) {
      return { notFound: true }
    }

    // Fetch subscription info
    const subscription = await getSubscription(userData.id)
    console.log(subscription)
    const subscriptionInfo = {
      isPro: subscription?.tier === 'PRO',
      isLifetime: subscription?.transactionType === 'LIFETIME',
      isGracePeriodPro: false,
      inGracePeriod: false,
    }

    return {
      props: {
        userData: {
          displayName: userData.displayName,
          name: userData.name,
          stream_online: userData.stream_online,
          image: userData.image,
          createdAt: userData.createdAt.toISOString(),
          mmr: userData.mmr,
          settings: userData.settings,
        },
        subscriptionInfo,
        username: username.toLowerCase(),
      },
      revalidate: 600, // Revalidate every 10 minutes
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    return { notFound: true }
  }
}

export default CommandsPage
