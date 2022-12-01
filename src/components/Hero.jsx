import { useId } from 'react'
import Image from 'next/image'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { PhoneFrame } from '@/components/PhoneFrame'
import { useSession } from 'next-auth/react'
import dotaLogo from '@/images/logos/dota.svg'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

function BackgroundIllustration(props) {
  let id = useId()

  return (
    <div {...props}>
      <svg
        viewBox="0 0 1026 1026"
        fill="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full animate-spin-slow"
      >
        <path
          d="M1025 513c0 282.77-229.23 512-512 512S1 795.77 1 513 230.23 1 513 1s512 229.23 512 512Z"
          stroke="#D4D4D4"
          strokeOpacity="0.7"
        />
        <path
          d="M513 1025C230.23 1025 1 795.77 1 513"
          stroke={`url(#${id}-gradient-1)`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id={`${id}-gradient-1`}
            x1="1"
            y1="513"
            x2="1"
            y2="1025"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#06b6d4" />
            <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        viewBox="0 0 1026 1026"
        fill="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full animate-spin-reverse-slower"
      >
        <path
          d="M913 513c0 220.914-179.086 400-400 400S113 733.914 113 513s179.086-400 400-400 400 179.086 400 400Z"
          stroke="#D4D4D4"
          strokeOpacity="0.7"
        />
        <path
          d="M913 513c0 220.914-179.086 400-400 400"
          stroke={`url(#${id}-gradient-2)`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id={`${id}-gradient-2`}
            x1="913"
            y1="513"
            x2="913"
            y2="913"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#06b6d4" />
            <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

function PlayIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="11.5" stroke="#D4D4D4" />
      <path
        d="M9.5 14.382V9.618a.5.5 0 0 1 .724-.447l4.764 2.382a.5.5 0 0 1 0 .894l-4.764 2.382a.5.5 0 0 1-.724-.447Z"
        fill="#A3A3A3"
        stroke="#A3A3A3"
      />
    </svg>
  )
}

export function Hero() {
  const name = useSession()?.data?.user?.name || 'streamers'
  const { data: featuredUsers } = useSWR('/api/featured-users', fetcher)
  console.log(featuredUsers)

  return (
    <div className="overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36">
      <Container>
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-20">
          <div className="relative z-10 mx-auto max-w-2xl lg:col-span-7 lg:max-w-none lg:pt-6 xl:col-span-6">
            <h1 className="flex items-center space-x-2 text-4xl font-medium tracking-tight text-gray-900">
              <span>Welcome, {name}</span>
              <Image
                src="/images/peepoclap.webp"
                width={38}
                height={38}
                alt="wave"
              />
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              By leveraging insights from the Dota 2 official API, Dotabod will
              know exactly when to hide sensitive streamer information or engage
              with your Twitch audience.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-4">
              <Button href="/login">
                <PlayIcon className="h-6 w-6 flex-none" />
                <span className="ml-2.5">Get started</span>
              </Button>
            </div>
          </div>
          <div className="relative mt-10 sm:mt-20 lg:col-span-5 lg:row-span-2 lg:mt-0 xl:col-span-6">
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
        <div className="relative -mt-4 lg:col-span-7 lg:mt-0 xl:col-span-6">
          <p className="text-center text-sm font-semibold text-gray-900 lg:text-left">
            As featured in
          </p>
          <ul
            role="list"
            className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start"
          >
            {featuredUsers?.map(({ name, image }) => (
              <li key={name} className="">
                <a
                  className="flex flex-col items-center space-y-1 rounded-lg px-4 py-4 transition-shadow hover:shadow-lg"
                  rel="noreferrer"
                  href={`https://twitch.tv/${name}`}
                  target="_blank"
                >
                  <Image
                    src={image}
                    width={50}
                    height={50}
                    alt={name}
                    unoptimized
                    className="rounded-lg shadow-lg"
                  />
                  <span className="text-xs text-gray-500">{name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </div>
  )
}
