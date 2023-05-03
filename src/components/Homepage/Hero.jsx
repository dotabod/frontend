import { WatchDotabod } from './WatchDotabod'
import DiscordSvg from 'src/images/logos/discord.svg'
import Image from 'next/image'
import { Button } from 'antd'
import { Container } from 'src/components/Container'
import { PhoneFrame } from '@/components/Homepage/PhoneFrame'
import { useSession } from 'next-auth/react'
import dotaLogo from 'src/images/logos/dota.svg'
import TwitchSvg from 'src/images/logos/twitch.svg'
import { BackgroundIllustration } from '@/components/Homepage/BackgroundIllustration'
import Link from 'next/link'
import { CursorArrowRaysIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'next-i18next'

const featuredUsers = [
  {
    name: 'Gorgc',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/gorgc-profile_image-469e05d25a1e8594-70x70.jpeg',
  },
  {
    name: 'Grubby',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/e5d06b76-4e12-44f9-82cf-1bcc03359667-profile_image-150x150.png',
  },
  {
    name: 'TpaBoMaH',
    image: 'https://i.imgur.com/5NOuZ3z.png',
    supporter: false,
  },
  {
    name: 'EternaLEnVyy',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/eternalenvyy-profile_image-6b20e441fd6342b1-70x70.png',
  },
  {
    name: 'XcaliburYe',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/69bea0f7-b170-4067-92f0-d1410a020b62-profile_image-150x150.png',
  },
  {
    name: 'qSnake',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/7d5a4932-be42-481c-a47a-4136404f2c54-profile_image-70x70.png',
  },
  {
    name: 'Cr1tdota',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/cr1tdota-profile_image-7e4ec45409fd1b1f-150x150.jpeg',
  },
  {
    name: 'BananaSlamJamma',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/bananaslamjamma-profile_image-8a07eac563581ffe-70x70.png',
  },
  {
    name: 'canceldota',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/e381d7db-3efc-44c4-b2b7-51007be87791-profile_image-150x150.png',
  },
  {
    name: 'GunnarDotA2',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/e7ca5b8a-cf52-4b7a-addd-d6d7b1b4216c-profile_image-150x150.png',
  },
  {
    name: 'sheevergaming',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/09074d0a-4a09-4db0-b290-29bea0fe963d-profile_image-150x150.png',
  },
  {
    name: 'ODPixel',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/21d275f5-b27d-4cf2-805e-94006c08c25c-profile_image-150x150.png',
  },
  {
    link: false,
    name: 'You?',
    supporter: false,
    image:
      'https://static-cdn.jtvnw.net/user-default-pictures-uv/75305d54-c7cc-40d1-bb9c-91fbe85943c7-profile_image-300x300.png',
  },
]

const grouped = featuredUsers.reduce((result, item) => {
  const key = item.supporter ? 'supporters' : 'nonSupporters'
  if (!result[key]) {
    result[key] = []
  }
  result[key].push(item)
  return result
}, {})

const TwitchUser = ({
  image,
  last,
  link,
  name,
  onClick,
  session,
  supporter,
}) => {
  const userName = last ? session?.data?.user?.name || name : name
  const imagesrc = last ? session?.data?.user?.image || image : image

  return (
    <li className="relative">
      <a
        className="flex flex-col items-center space-y-1 rounded-lg px-4 py-4 transition-shadow hover:shadow-lg"
        rel="noreferrer"
        href={link !== false ? `https://twitch.tv/${userName}` : '#'}
        target="_blank"
        onClick={onClick}
      >
        <Image
          src={imagesrc}
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
  const { t } = useTranslation()
  const session = useSession()
  const name = session.data?.user?.name || 'streamers'
  const { supporters, nonSupporters } = grouped

  return (
    <div className="overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36">
      <Container>
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-20">
          <div className="relative z-10 mx-auto max-w-2xl lg:col-span-7 lg:max-w-none lg:pt-6 xl:col-span-6">
            <h1 className="flex items-center space-x-2 text-4xl font-medium tracking-tight text-gray-200">
              <span>Welcome, {name}</span>
              <Image
                src="/images/emotes/peepoclap.webp"
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
                      <span>Go to dashboard</span>
                    ) : (
                      <span>Get started</span>
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
                  <span>Join Discord</span>
                </div>
              </Button>
              <WatchDotabod />
            </div>
          </div>
          <div className="relative lg:col-span-5 lg:row-span-2 xl:col-span-6">
            <BackgroundIllustration className="absolute left-1/2 top-4 h-[1026px] w-[1026px] -translate-x-1/3 stroke-gray-300/70 [mask-image:linear-gradient(to_bottom,white_20%,transparent_75%)] sm:top-16 sm:-translate-x-1/2 lg:-top-16 lg:ml-12 xl:-top-14 xl:ml-0" />
            <div className="-mx-4 h-[448px] px-9 [mask-image:linear-gradient(to_bottom,white_60%,transparent)] sm:mx-0 lg:absolute lg:-inset-x-10 lg:-top-10 lg:-bottom-20 lg:h-auto lg:px-0 lg:pt-10 xl:-bottom-32">
              <PhoneFrame className="mx-auto max-w-[366px]" priority>
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
        <div className="relative lg:col-span-7 xl:col-span-6">
          {supporters && (
            <>
              <div className="flex items-center space-x-2">
                <Image
                  src="https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp"
                  width={24}
                  height={24}
                  className="animate-bounce rounded"
                  alt="Gigachad"
                />
                <h1>Gigachad supporters</h1>
              </div>
              <ul
                role="list"
                className="mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start"
              >
                {supporters?.map(({ name, image, link, supporter }) => {
                  const isLast = name === 'You?'
                  return (
                    <TwitchUser
                      key={name}
                      supporter={supporter}
                      link={link}
                      last={isLast}
                      session={session}
                      name={name}
                      onClick={(e) => {
                        if (link === false) {
                          e.preventDefault()
                        }
                      }}
                      image={image}
                    />
                  )
                })}
              </ul>
            </>
          )}

          <div className="relative lg:col-span-7 xl:col-span-6">
            <div className="flex items-center space-x-2 text-center text-sm font-semibold text-gray-300 lg:text-left">
              <Image src={TwitchSvg} width={18} height={18} alt="twitch logo" />
              <span>Featured in over 5,000 Twitch streamers</span>
            </div>
          </div>
          <ul
            role="list"
            className="mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start"
          >
            {nonSupporters?.map(({ name, image, link, supporter }) => {
              const isLast = name === 'You?'
              return (
                <TwitchUser
                  key={name}
                  supporter={supporter}
                  link={link}
                  last={isLast}
                  session={session}
                  name={name}
                  onClick={(e) => {
                    if (link === false) {
                      e.preventDefault()
                    }
                  }}
                  image={image}
                />
              )
            })}
          </ul>
        </div>
      </Container>
    </div>
  )
}
