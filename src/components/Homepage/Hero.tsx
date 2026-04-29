import { Button, Popover, Skeleton } from 'antd'
import {
  LucideHome,
  LucideShield,
  LucideSparkles,
  LucideTerminalSquare,
  LucideZap,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { useState } from 'react'
import { Container } from 'src/components/Container'
import TwitchSvg from 'src/images/logos/twitch.svg'
import useSWR from 'swr'
import { BackgroundIllustration } from '@/components/Homepage/BackgroundIllustration'
import { fetcher } from '@/lib/fetcher'
import { useTrack } from '@/lib/track'
import { LiveIcon } from './LiveIcon'

const highlightPills = [
  {
    icon: LucideZap,
    label: 'Automated predictions, overlays, and setup',
  },
  {
    icon: LucideShield,
    label: 'Anti-snipe protection for ranked games',
  },
  {
    icon: LucideSparkles,
    label: 'Live game intelligence that feels premium on stream',
  },
]

const heroStats = [
  {
    label: 'Twitch streamers trust Dotabod',
    value: '30,000+',
  },
  {
    label: 'Game-aware chat moments',
    value: '50+',
  },
  {
    label: 'Languages supported',
    value: '40+',
  },
]

const spotlightCards = [
  {
    description:
      'Auto predictions, OBS scene switching, and setup that removes busywork before you go live.',
    title: 'Automation engine',
  },
  {
    description:
      'Minimap, hero picks, and queue blockers help protect your ranked sessions from stream snipers.',
    title: 'Anti-snipe suite',
  },
  {
    description:
      'Roshan timers, win probability, MMR overlays, and notable players keep viewers locked in.',
    title: 'Game intelligence',
  },
]

const TwitchUser = ({
  image,
  last,
  name,
  onClick,
}: {
  image: string
  last: boolean
  name: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
}) => {
  const session = useSession()
  const userName = last ? session?.data?.user?.name || name : name
  const imagesrc = last ? session?.data?.user?.image || image : image
  const [open, setOpen] = useState(false)
  const track = useTrack()

  const handleSignIn = () => {
    track('homepage - signin from popover')
    void signIn('twitch', { callbackUrl: '/dashboard' })
  }

  const popoverContent = (
    <div className='flex flex-col items-center py-2 px-4'>
      <p className='mb-4 text-center'>Sign in to get started with your own Dotabod experience!</p>
      <Button type='primary' onClick={handleSignIn}>
        Sign in with Twitch
      </Button>
    </div>
  )

  if (userName === 'You?') {
    return (
      <li className='relative'>
        <Popover
          content={popoverContent}
          title='Join the community!'
          trigger='click'
          open={open}
          onOpenChange={setOpen}
        >
          <button
            type='button'
            className='flex w-full flex-col items-center space-y-1 rounded-lg px-4 py-4 transition-all duration-300 ease-in-out hover:bg-primary-100 hover:shadow-xl hover:scale-105 cursor-pointer'
            onClick={() => {
              if (onClick) onClick({} as unknown as React.MouseEvent<HTMLAnchorElement, MouseEvent>)
              setOpen(true)
            }}
          >
            <Image
              src={imagesrc}
              onError={(e) => {
                e.currentTarget.src = '/images/hero/default.png'
              }}
              width={50}
              height={50}
              alt={userName}
              unoptimized
              className='rounded-lg shadow-lg'
            />
            <span className='text-xs text-gray-300 transition-colors duration-300 ease-in-out group-hover:text-primary-foreground'>
              {userName}
            </span>
          </button>
        </Popover>
      </li>
    )
  }

  return (
    <li className='relative'>
      <Link
        className='flex flex-col items-center space-y-1 rounded-lg px-4 py-4 transition-all duration-300 ease-in-out hover:bg-primary-100 hover:shadow-xl hover:scale-105'
        rel='noreferrer'
        onClick={onClick}
        href={`/${userName}`}
      >
        <Image
          src={imagesrc}
          onError={(e) => {
            e.currentTarget.src = '/images/hero/default.png'
          }}
          width={50}
          height={50}
          alt={userName}
          unoptimized
          className='rounded-lg shadow-lg'
        />
        <span className='text-xs text-gray-300 transition-colors duration-300 ease-in-out group-hover:text-primary-foreground'>
          {userName}
        </span>
      </Link>
    </li>
  )
}

export function Hero() {
  const session = useSession()
  const { data: users, isLoading } = useSWR<{
    topLive: { name: string; image: string }[]
  }>('/api/featured-users', fetcher)
  const track = useTrack()

  // Check if the logged-in user is already in the top streamers list
  const userInTopLive =
    session.data?.user?.name &&
    users?.topLive?.some(
      (user) => user.name.toLowerCase() === session.data?.user?.name?.toLowerCase(),
    )

  return (
    <section className='relative overflow-hidden border-b border-white/10 bg-linear-to-b from-slate-950 via-gray-900 to-gray-900 py-10 sm:py-14 lg:py-20'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.14),transparent_26%)]' />
      <Container>
        <div className='relative z-10 grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10'>
          <div className='max-w-3xl'>
            <div className='inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100'>
              <LucideSparkles className='h-4 w-4 text-cyan-300' />
              Premium Dota 2 stream tools for creators who want more than basic overlays
            </div>

            <div className='mt-6 space-y-5'>
              <h1 className='max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl xl:text-6xl'>
                Make every Dota 2 match feel like a premium production.
              </h1>
              <p className='max-w-2xl text-lg leading-8 text-gray-300 sm:text-xl'>
                Dotabod automates predictions, protects your ranked games, and turns live match data
                into overlays, chat moments, and viewer-friendly experiences that feel sharp from
                the first minute on stream.
              </p>
            </div>

            <div className='mt-8 grid gap-3 sm:grid-cols-3'>
              {highlightPills.map((pill) => {
                const Icon = pill.icon

                return (
                  <div
                    key={pill.label}
                    className='rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-gray-200 shadow-[0_10px_50px_-30px_rgba(34,211,238,0.55)]'
                  >
                    <Icon className='mb-3 h-5 w-5 text-cyan-300' />
                    <p>{pill.label}</p>
                  </div>
                )
              })}
            </div>

            <div className='mt-8 flex flex-wrap gap-x-4 gap-y-4'>
              <Link href='/dashboard' prefetch={false}>
                <Button type='primary' size='large'>
                  <div className='flex items-center space-x-2'>
                    <LucideHome className='flex h-4 w-4' />
                    {session?.status === 'authenticated' ? (
                      <span>Open dashboard</span>
                    ) : (
                      <span>Get started free</span>
                    )}
                  </div>
                </Button>
              </Link>
              <Link href='/arteezy'>
                <Button size='large' className='space-x-2'>
                  <div className='flex items-center space-x-2'>
                    <LucideTerminalSquare className='flex h-4 w-4' />
                    <span>Explore live commands</span>
                  </div>
                </Button>
              </Link>
              <Link href='/#pricing' scroll>
                <Button size='large' type='text' className='!text-gray-200 hover:!text-white'>
                  Compare plans
                </Button>
              </Link>
            </div>

            <dl className='mt-10 grid gap-4 sm:grid-cols-3'>
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className='rounded-2xl border border-white/10 bg-black/20 px-4 py-5 backdrop-blur-sm'
                >
                  <dt className='text-sm text-gray-400'>{stat.label}</dt>
                  <dd className='mt-2 text-2xl font-semibold text-white'>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className='relative'>
            <BackgroundIllustration className='absolute left-1/2 top-1/2 h-[920px] w-[920px] -translate-x-1/2 -translate-y-1/2 stroke-gray-300/50 [mask-image:linear-gradient(to_bottom,white_30%,transparent_85%)]' />
            <div className='relative space-y-4'>
              <div className='rounded-[2rem] border border-white/10 bg-linear-to-br from-white/[0.08] via-white/[0.03] to-transparent p-5 shadow-[0_30px_120px_-60px_rgba(34,211,238,0.45)] backdrop-blur-xl sm:p-6'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300'>
                      Live on stream
                    </p>
                    <h2 className='mt-2 text-2xl font-semibold text-white'>
                      The core toolkit viewers actually notice
                    </h2>
                  </div>
                  <span className='rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300'>
                    Ready fast
                  </span>
                </div>

                <div className='mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950'>
                  <Image
                    src='/images/dashboard/bets.png'
                    alt='Dotabod predictions dashboard preview'
                    width={1200}
                    height={760}
                    priority
                    className='h-auto w-full object-cover'
                  />
                </div>

                <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                  {spotlightCards.map((card) => (
                    <div
                      key={card.title}
                      className='rounded-2xl border border-white/10 bg-black/20 p-4'
                    >
                      <h3 className='text-sm font-semibold uppercase tracking-[0.22em] text-gray-200'>
                        {card.title}
                      </h3>
                      <p className='mt-2 text-sm leading-6 text-gray-400'>{card.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                key='twitch-streamer-list'
                className='rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur-xl sm:p-6'
              >
                <div className='flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-200'>
                  <Image src={TwitchSvg} width={18} height={18} alt='twitch logo' />
                  <span>
                    Trusted by over {new Intl.NumberFormat('en-US').format(30000)} Twitch streamers,
                    including live creators using Dotabod right now
                  </span>
                  <LiveIcon />
                </div>

                {isLoading || !users?.topLive?.length ? (
                  <ul className='flex flex-wrap justify-start pt-4'>
                    {[...Array(10)].map((_, i) => (
                      <li key={`skeleton-${i}`} className='relative'>
                        <div className='flex flex-col items-center space-y-2 px-4 py-2'>
                          <Skeleton.Avatar
                            active
                            size={50}
                            shape='square'
                            style={{ borderRadius: 8 }}
                          />
                          <Skeleton.Input
                            block={false}
                            active
                            size='small'
                            style={{ height: 5, minWidth: 55, width: 55 }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : users?.topLive?.length && users?.topLive?.length > 0 ? (
                  <ul className='flex flex-wrap justify-start'>
                    {users?.topLive?.map(({ name, image }) => (
                      <TwitchUser
                        key={name}
                        last={false}
                        name={name}
                        image={image}
                        onClick={() => {
                          track('homepage - top live twitch profile')
                        }}
                      />
                    ))}
                    {!userInTopLive && (
                      <TwitchUser
                        key='You?'
                        last={true}
                        name='You?'
                        onClick={() => {
                          track('homepage - static twitch profile')
                        }}
                        image='/images/hero/default.png'
                      />
                    )}
                  </ul>
                ) : (
                  <p className='pt-4 text-center text-gray-300'>No top streamers found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
