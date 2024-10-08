import { BackgroundIllustration } from '@/components/Homepage/BackgroundIllustration'
import { PhoneFrame } from '@/components/Homepage/PhoneFrame'
import { fetcher } from '@/lib/fetcher'
import { useTrack } from '@/lib/track'
import { CursorArrowRaysIcon } from '@heroicons/react/24/outline'
import { Button } from 'antd'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from 'src/components/Container'
import DiscordSvg from 'src/images/logos/discord.svg'
import dotaLogo from 'src/images/logos/dota.svg'
import TwitchSvg from 'src/images/logos/twitch.svg'
import useSWR from 'swr'
import Particles from '../magicui/particles'
import { LiveIcon } from './LiveIcon'
import { useTranslation } from 'next-i18next'

const featuredUsers = [
  {
    name: 'Arteezy',
    supporter: false,
    image: '/images/hero/arteezy.png',
  },
  {
    name: 'Gorgc',
    supporter: false,
    image: '/images/hero/gorgc.jpeg',
  },
  {
    name: 'qojqva',
    supporter: false,
    image: '/images/hero/qojqva.jpeg',
  },
  {
    name: 'Grubby',
    supporter: false,
    image: '/images/hero/grubby.png',
  },
  {
    name: 'watsondoto',
    supporter: false,
    image: '/images/hero/watsondoto.jpg',
  },
  {
    name: 'admiralbulldog',
    supporter: false,
    image: '/images/hero/admiralbulldog.jpeg',
  },
  {
    name: 'TpaBoMaH',
    image: '/images/hero/tpabomah.png',
    supporter: false,
  },
  {
    name: 'XcaliburYe',
    supporter: false,
    image: '/images/hero/xcaliburye.png',
  },
  {
    name: 'Cr1tdota',
    supporter: false,
    image: '/images/hero/crit.jpeg',
  },
  {
    name: 'canceldota',
    supporter: false,
    image: '/images/hero/cancel.png',
  },
  {
    name: 'GunnarDotA2',
    supporter: false,
    image: '/images/hero/gunnar.png',
  },
  {
    name: 'You?',
    supporter: false,
    image: '/images/hero/default.png',
  },
]

const grouped = featuredUsers.reduce((result, item) => {
  const key = item.supporter ? 'supporters' : 'nonSupporters'
  if (!result[key]) {
    result[key] = []
  }
  result[key].push(item)
  return result
}, {}) as {
  supporters: typeof featuredUsers
  nonSupporters: typeof featuredUsers
}

const TwitchUser = ({
  image,
  last,
  name,
  onClick,
  session,
  supporter,
}: {
  image: string
  last: boolean
  name: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
  session: any
  supporter: boolean
}) => {
  const userName = last ? session?.data?.user?.name || name : name
  const imagesrc = last ? session?.data?.user?.image || image : image

  return (
    <li className="relative">
      <a
        className="flex flex-col items-center space-y-1 rounded-lg px-4 py-4 transition-shadow hover:shadow-lg"
        rel="noreferrer"
        onClick={onClick}
        href={userName === 'You?' ? '#' : `https://twitch.tv/${userName}`}
        target="_blank"
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
          className="rounded-lg shadow-lg"
        />
        <span className="text-xs text-gray-300">{userName}</span>
      </a>
    </li>
  )
}

export function Hero() {
  const session = useSession()
  const name = session.data?.user?.name || 'streamers'
  const { nonSupporters } = grouped
  // get users from api/featured-users
  const { data: users, isLoading } = useSWR<{
    randomLive: { name: string; image: string }[]
    topLive: { name: string; image: string }[]
  }>('/api/featured-users', fetcher)
  const track = useTrack()
  const { t } = useTranslation('common')

  return (
    <div className="overflow-hidden py-15 sm:py-27 lg:pb-27 xl:pb-31">
      <Container>
        <Particles
          className="absolute inset-0"
          quantity={50}
          ease={70}
          size={0.05}
          staticity={40}
          color={'#ffffff'}
        />
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-20">
          <div className="relative z-10 mx-auto max-w-2xl lg:col-span-7 lg:max-w-none lg:pt-6 xl:col-span-6">
            <h1 className="flex items-center space-x-2 text-4xl font-medium tracking-tight text-gray-200">
              <span>{t('hero.title', { name })}</span>
              <Image
                src="/images/emotes/peepoclap.webp"
                unoptimized
                width={38}
                height={38}
                alt="peepoclap"
              />
            </h1>
            <p className="mt-6 text-lg text-gray-300">
              {t('hero.description')}
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-4">
              <Link href="/dashboard">
                <Button type="primary">
                  <div className="flex items-center space-x-2">
                    <CursorArrowRaysIcon className="flex h-4 w-4" />
                    {session?.status === 'authenticated' ? (
                      <span>{t('button.goToDashboard')}</span>
                    ) : (
                      <span>{t('button.getStarted')}</span>
                    )}
                  </div>
                </Button>
              </Link>
              <Button
                href="https://discord.dotabod.com"
                target="_blank"
                className="space-x-2"
              >
                <div className="flex items-center space-x-2">
                  <Image alt="discord" src={DiscordSvg} className="h-4 w-4" />
                  <span>{t('button.joinDiscord')}</span>
                </div>
              </Button>
            </div>
          </div>
          <div className="relative row-span-1 lg:col-span-5 lg:row-span-2 xl:col-span-6">
            <BackgroundIllustration className="absolute left-1/2 top-4 h-[1026px] w-[1026px] -translate-x-1/3 stroke-gray-300/70 [mask-image:linear-gradient(to_bottom,white_20%,transparent_75%)] sm:top-16 sm:-translate-x-1/2 lg:-top-16 lg:ml-12 xl:-top-14 xl:ml-0" />
            <div className="-mx-4 h-[238px] px-9 [mask-image:linear-gradient(to_bottom,white_60%,transparent)] sm:mx-0 lg:absolute lg:-inset-x-10 lg:-bottom-20 lg:-top-10 lg:h-auto lg:px-0 lg:pt-10 xl:-bottom-32">
              <PhoneFrame
                className="mx-auto max-w-[266px] lg:max-w-[366px]"
                priority
              >
                <Image
                  src={dotaLogo}
                  width={240}
                  height={240}
                  alt="dota logo"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                />
              </PhoneFrame>
            </div>
          </div>
        </div>
        {isLoading || !users?.topLive?.length || !users?.randomLive?.length ? (
          <>
            <div className="relative lg:col-span-7 xl:col-span-6">
              <div className="flex items-center space-x-2 text-center text-sm font-semibold text-gray-300 lg:text-left">
                <Image
                  src={TwitchSvg}
                  width={18}
                  height={18}
                  alt="twitch logo"
                />
                <span>
                  {t('hero.featuredIn', { count: new Intl.NumberFormat().format(20000) })}
                </span>
              </div>
            </div>
            <ul className="mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start">
              {nonSupporters?.map(({ name, image, supporter }) => {
                const isLast = name === 'You?'
                return (
                  <TwitchUser
                    key={name}
                    supporter={supporter}
                    last={isLast}
                    session={session}
                    name={name}
                    onClick={(e) => {
                      if (name === 'You?') {
                        e.preventDefault()
                      }
                      track('homepage - static twitch profile')
                    }}
                    image={image}
                  />
                )
              })}
            </ul>
          </>
        ) : (
          <>
            <div className="relative lg:col-span-7 xl:col-span-6">
              {users?.topLive?.length > 0 && (
                <>
                  <div className="relative lg:col-span-7 xl:col-span-6">
                    <div className="flex items-center space-x-2 text-center text-sm font-semibold text-gray-300 lg:text-left">
                      <LiveIcon />
                      <span>{t('hero.topStreamers')}</span>
                    </div>
                  </div>
                  <ul className="mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start">
                    {users?.topLive?.map(({ name, image }) => (
                      <TwitchUser
                        key={name}
                        supporter={false}
                        last={false}
                        session={session}
                        name={name}
                        image={image}
                        onClick={() => {
                          track('homepage - top live twitch profile')
                        }}
                      />
                    ))}
                  </ul>
                </>
              )}

              {users?.randomLive?.length > 0 && (
                <>
                  <div className="relative lg:col-span-7 xl:col-span-6">
                    <div className="flex items-center space-x-2 text-center text-sm font-semibold text-gray-300 lg:text-left">
                      <LiveIcon />
                      <span>{t('hero.randomStreamers')}</span>
                    </div>
                  </div>
                  <ul className="mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start">
                    {users?.randomLive?.map(({ name, image }) => (
                      <TwitchUser
                        key={name}
                        supporter={false}
                        last={false}
                        session={session}
                        name={name}
                        image={image}
                        onClick={() => {
                          track('homepage - random twitch profile')
                        }}
                      />
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </Container>
    </div>
  )
}
