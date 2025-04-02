import { BackgroundIllustration } from '@/components/Homepage/BackgroundIllustration'
import { PhoneFrame } from '@/components/Homepage/PhoneFrame'
import { fetcher } from '@/lib/fetcher'
import { useTrack } from '@/lib/track'
import { CursorArrowRaysIcon } from '@heroicons/react/24/outline'
import { Button, Popover, Skeleton } from 'antd'
import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Container } from 'src/components/Container'
import DiscordSvg from 'src/images/logos/discord.svg'
import dotaLogo from 'src/images/logos/dota.svg'
import TwitchSvg from 'src/images/logos/twitch.svg'
import useSWR from 'swr'
import { LiveIcon } from './LiveIcon'

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
  const name = session.data?.user?.name || 'streamers'
  // get users from api/featured-users
  const { data: users, isLoading } = useSWR<{
    topLive: { name: string; image: string }[]
  }>('/api/featured-users', fetcher)
  const track = useTrack()

  return (
    <div className='overflow-hidden py-4 sm:py-4 lg:pb-4 xl:pb-4'>
      <Container>
        <div className='lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-20'>
          <div className='relative z-10 mx-auto max-w-2xl lg:col-span-7 lg:max-w-none lg:pt-6 xl:col-span-6'>
            <h1 className='flex items-center space-x-2 text-4xl font-medium tracking-tight text-gray-200'>
              <span>Welcome, {name}</span>
              <Image
                src='/images/emotes/peepoclap.webp'
                unoptimized
                width={38}
                height={38}
                alt='peepoclap'
              />
            </h1>
            <p className='mt-6 text-lg text-gray-300'>
              Dotabod is the all-in-one toolkit that transforms your Dota 2 stream, providing
              real-time stats, automated Twitch predictions, and intelligent overlays that engage
              your audience effortlessly.
            </p>
            <div className='mt-8 flex flex-wrap gap-x-6 gap-y-4'>
              <Link href='/dashboard'>
                <Button type='primary'>
                  <div className='flex items-center space-x-2'>
                    <CursorArrowRaysIcon className='flex h-4 w-4' />
                    {session?.status === 'authenticated' ? (
                      <span>Go to dashboard</span>
                    ) : (
                      <span>Get started</span>
                    )}
                  </div>
                </Button>
              </Link>
              <Button href='https://discord.dotabod.com' target='_blank' className='space-x-2'>
                <div className='flex items-center space-x-2'>
                  <Image alt='discord' src={DiscordSvg} className='h-4 w-4' />
                  <span>Join Discord</span>
                </div>
              </Button>
            </div>
          </div>
          <div className='relative row-span-1 lg:col-span-5 lg:row-span-2 xl:col-span-6'>
            <BackgroundIllustration className='absolute left-1/2 top-4 h-[1026px] w-[1026px] -translate-x-1/3 stroke-gray-300/70 [mask-image:linear-gradient(to_bottom,white_20%,transparent_75%)] sm:top-16 sm:-translate-x-1/2 lg:-top-16 lg:ml-12 xl:-top-14 xl:ml-0' />
            <div className='-mx-4 h-[238px] px-9 [mask-image:linear-gradient(to_bottom,white_60%,transparent)] sm:mx-0 lg:absolute lg:-inset-x-10 lg:-bottom-20 lg:-top-10 lg:h-auto lg:px-0 lg:pt-10 xl:-bottom-32'>
              <PhoneFrame className='mx-auto max-w-[266px] lg:max-w-[366px]' priority>
                <Image
                  src={dotaLogo}
                  width={240}
                  height={240}
                  alt='dota logo'
                  className='pointer-events-none absolute inset-0 h-full w-full'
                />
              </PhoneFrame>
            </div>
          </div>
        </div>

        <div className='relative lg:col-span-7 xl:col-span-6'>
          <div className='flex items-center space-x-2 text-center text-sm font-semibold text-gray-300 lg:text-left'>
            <Image src={TwitchSvg} width={18} height={18} alt='twitch logo' />
            <span>
              Trusted by Over {new Intl.NumberFormat().format(20000)} Twitch Streamers Including:
            </span>
            <LiveIcon />
          </div>
        </div>

        <div className='relative lg:col-span-7 xl:col-span-6'>
          {isLoading ? (
            <ul className='mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start pt-4'>
              {[...Array(10)].map((_, i) => (
                <li key={`skeleton-${i}`} className='relative'>
                  <div className='flex flex-col items-center space-y-2 px-4 py-2'>
                    <Skeleton.Avatar active size={50} shape='square' style={{ borderRadius: 8 }} />
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
          ) : (
            users?.topLive?.length && (
              <ul className='mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start'>
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
                <TwitchUser
                  key='You?'
                  last={true}
                  name='You?'
                  onClick={() => {
                    track('homepage - static twitch profile')
                  }}
                  image='/images/hero/default.png'
                />
              </ul>
            )
          )}
        </div>
      </Container>
    </div>
  )
}
