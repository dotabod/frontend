import { Button, Empty, Input, Segmented, Skeleton, Tag, Tooltip } from 'antd'
import { CrownIcon, ExternalLinkIcon, GiftIcon } from 'lucide-react'
import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Container } from '@/components/Container'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import HomepageShell from '@/components/Homepage/HomepageShell'
import prisma from '@/lib/db'
import { useGetSettingsByUsername } from '@/lib/hooks/useUpdateSetting'
import { getValueOrDefault } from '@/lib/settings'
import { createGiftLink } from '@/utils/gift-links'
import { getSubscription } from '@/utils/subscription'

const FEATURED_COMMAND_KEYS = [
  'commandMmr',
  'commandWL',
  'commandHero',
  'commandNP',
  'commandLGS',
  'commandBuilds',
  'commandProfile',
  'commandDotabuff',
] as const

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
  const [openCardKey, setOpenCardKey] = useState<string | null>(null)
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
      if (permission === 'Viewers') return CommandDetail[command].allowed === 'all'
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

  const enabledFeaturedCommands = FEATURED_COMMAND_KEYS.filter(
    (key) => commands.find((c) => c.command === key)?.isEnabled,
  )

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
        <title>{`${finalLoading || !finalUserData?.displayName ? '...' : finalUserData.displayName}'s Dota 2 Commands — Dotabod`}</title>
        <meta
          name='description'
          content={`Chat commands available in ${finalUserData?.displayName || 'this streamer'}'s Twitch channel via Dotabod.`}
        />
        {username && typeof username === 'string' && (
          <link rel='canonical' href={`https://dotabod.com/${username}`} />
        )}
        <meta
          name='robots'
          content={username === '[username]' ? 'noindex, nofollow' : 'index, follow'}
        />
      </Head>

      {/* Full-width hero */}
      <div className='relative border-b border-gray-700/50 bg-gradient-to-br from-gray-950 to-gray-800'>
        <Container className='py-10 sm:py-14'>
          <div className='flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10'>
            {/* Avatar with live ring */}
            <div className='relative flex-shrink-0 self-start'>
              <div
                className={`absolute -inset-1.5 rounded-full ${
                  finalUserData?.stream_online ? 'animate-pulse bg-red-500/30' : 'bg-gray-600/10'
                }`}
              />
              {/* biome-ignore lint/performance/noImgElement: Dynamic image with onError fallback, not compatible with next/image */}
              <img
                onError={(e) => {
                  e.currentTarget.src = '/images/hero/default.png'
                }}
                src={finalUserData?.image || '/images/hero/default.png'}
                alt='Profile'
                width={100}
                height={100}
                className='relative rounded-full ring-2 ring-gray-700'
              />
              {finalUserData?.stream_online && (
                <span className='absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-2 py-px text-[10px] font-bold uppercase tracking-wide text-white'>
                  Live
                </span>
              )}
            </div>

            {/* Identity, stats, CTAs */}
            <div className='min-w-0 flex-grow'>
              <div className='mb-1 flex flex-wrap items-center gap-2'>
                <h1 className='text-3xl font-bold text-white sm:text-4xl'>
                  {finalLoading || !finalUserData?.displayName
                    ? 'Loading...'
                    : finalUserData.displayName}
                </h1>
                {!finalUserData?.stream_online && (
                  <span className='rounded-md bg-gray-700 px-2 py-0.5 text-xs text-gray-400'>
                    Offline
                  </span>
                )}
                {getSubscriptionBadge()}
              </div>

              <div className='mb-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-400'>
                {finalUserData?.mmr != null && finalUserData.mmr > 0 && (
                  <span>⚔ {finalUserData.mmr.toLocaleString()} MMR</span>
                )}
                <span>
                  Using Dotabod since{' '}
                  {finalLoading || !finalUserData?.createdAt
                    ? '...'
                    : new Date(finalUserData.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                </span>
                {!finalLoading && commands.length > 0 && (
                  <span>{commands.filter((c) => c.isEnabled).length} commands active</span>
                )}
              </div>

              <div className='flex flex-wrap gap-3'>
                <Link
                  target='_blank'
                  href={finalUserData ? `https://twitch.tv/${finalUserData.name}` : ''}
                  passHref
                >
                  <Button
                    size='large'
                    icon={<ExternalLinkIcon size={16} />}
                    className='flex items-center'
                  >
                    Watch on Twitch
                  </Button>
                </Link>
                <Link
                  href={createGiftLink(
                    (ssrUsername || (typeof username === 'string' ? username : '')) as string,
                  )}
                  passHref
                >
                  <Button
                    type='primary'
                    size='large'
                    icon={<GiftIcon size={16} />}
                    className='flex items-center'
                  >
                    Gift Subscription
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Page content */}
      <Container className='py-8'>
        {/* Featured commands strip */}
        {!finalLoading && enabledFeaturedCommands.length > 0 && (
          <div className='mb-10'>
            <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500'>
              Popular commands
            </p>
            <div className='-mx-1 flex gap-3 overflow-x-auto px-1 pb-2'>
              {enabledFeaturedCommands.map((key) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => {
                    setOpenCardKey(key)
                    setTimeout(() => {
                      document
                        .getElementById(`command-card-${key}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 50)
                  }}
                  className='w-48 flex-shrink-0 cursor-pointer rounded-lg border border-gray-700 bg-gray-900/80 px-4 py-3 text-left hover:border-purple-500 hover:bg-gray-900 transition-colors'
                >
                  <div className='mb-1 font-mono text-sm font-semibold text-purple-400'>
                    {CommandDetail[key].cmd}
                  </div>
                  <div className='line-clamp-2 text-xs text-gray-400'>
                    {CommandDetail[key].description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className='mb-6 flex flex-wrap items-center gap-3'>
          <Segmented
            value={enabled}
            onChange={(v) => setEnabled(v as string)}
            options={['All', 'Enabled', 'Disabled']}
          />
          <Segmented
            value={permission}
            onChange={(v) => setPermission(v as string)}
            options={['All', 'Mods', 'Viewers']}
          />
          <Input
            placeholder='Search commands...'
            value={searchTerm}
            maxLength={200}
            style={{ width: 260 }}
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          />
          {!finalLoading && (
            <span className='ml-auto text-sm text-gray-500'>
              {filteredCommands.length} of {Object.keys(CommandDetail).length} commands
            </span>
          )}
        </div>

        {filteredCommands.length < 1 && (
          <Empty
            description={
              enabled === 'Enabled'
                ? `${finalUserData?.displayName || 'This streamer'} has no enabled commands matching your search.`
                : 'No matching commands found.'
            }
            imageStyle={{ height: 60 }}
          />
        )}

        <div className='mb-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
          {filteredCommands.map((key) => (
            <div id={`command-card-${key}`} key={key}>
              <CommandsCard
                readonly
                id={key}
                isOpen={openCardKey === key}
                onClose={() => setOpenCardKey(null)}
                publicLoading={finalLoading}
                publicIsEnabled={commands.find((c) => c.command === key)?.isEnabled}
                command={CommandDetail[key]}
              />
            </div>
          ))}
        </div>

        {/* Bottom conversion CTA */}
        <div className='mb-10 rounded-xl border border-gray-700 bg-gray-900 p-8 text-center'>
          <h2 className='mb-2 text-xl font-bold text-white'>
            Want these commands for your stream?
          </h2>
          <p className='mx-auto mb-5 max-w-md text-sm text-gray-400'>
            Dotabod adds real-time stats, automated predictions, and smart chat commands to your
            Dota 2 stream — free to get started.
          </p>
          <Link href='/dashboard'>
            <Button type='primary' size='large'>
              Set up Dotabod for free
            </Button>
          </Link>
        </div>
      </Container>
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
