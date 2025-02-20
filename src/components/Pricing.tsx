'use client'

import { useState } from 'react'
import { Radio, RadioGroup } from '@headlessui/react'
import clsx from 'clsx'
import Image from 'next/image'
import { Button } from 'antd'
import { Container } from '@/components/Container'
import { Logomark } from '@/components/Logo'

const plans = [
  {
    name: 'Tier 1',
    featured: false,
    price: { Monthly: '$2.50', Annually: '$25' },
    description:
      'Essential tools for new Dota 2 streamers looking to get started with professional overlays.',
    button: {
      label: 'Get started for free',
      href: '/register',
    },
    features: [
      'Win/Loss tracking and overlay',
      'MMR tracking and overlay',
      'Basic chat commands (!mmr, !wl)',
      'Stream delay configuration',
      'Single account support',
    ],
    logo: (
      <Image
        src="https://cdn.betterttv.net/emote/58cd3345994bb43c8d300b82/3x.webp"
        width={24}
        height={24}
        alt="Krappa"
      />
    ),
    logomarkClassName: 'fill-gray-300',
  },
  {
    name: 'Tier 2',
    featured: false,
    price: { Monthly: '$5', Annually: '$50' },
    description:
      'Advanced features for growing streamers who want better stream protection and engagement.',
    button: {
      label: 'Subscribe',
      href: '/register',
    },
    features: [
      'All Tier 1 features',
      'Anti-snipe suite (minimap, picks, queue, etc.)',
      'Automated game events',
      'Twitch betting system',
      'Multi-account MMR tracking',
    ],
    logo: (
      <Image
        src="https://cdn.betterttv.net/emote/61f2f17c06fd6a9f5be2630a/3x.webp"
        width={24}
        height={24}
        className="rounded"
        alt="Kappa"
      />
    ),
    logomarkClassName: 'fill-gray-500',
  },
  {
    name: 'Tier 3',
    featured: true,
    price: { Monthly: '$10', Annually: '$100' },
    description:
      'Premium features for serious streamers who need the ultimate in protection and customization.',
    button: {
      label: 'Subscribe',
      href: '/register',
    },
    features: [
      'All Tier 2 features',
      'Premium anti-sniping suite',
      'Queue status blocking',
      'Automated 7TV integration',
      'Automated Dotabod integration',
      'Automated OBS integration',
      'Multi-language support',
      'Priority support',
      'Beta feature access',
    ],
    logo: (
      <Image
        src="https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp"
        width={24}
        height={24}
        className="rounded"
        alt="Gigachad"
      />
    ),
    logomarkClassName: 'fill-purple-500',
  },
]

function CheckIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M9.307 12.248a.75.75 0 1 0-1.114 1.004l1.114-1.004ZM11 15.25l-.557.502a.75.75 0 0 0 1.15-.043L11 15.25Zm4.844-5.041a.75.75 0 0 0-1.188-.918l1.188.918Zm-7.651 3.043 2.25 2.5 1.114-1.004-2.25-2.5-1.114 1.004Zm3.4 2.457 4.25-5.5-1.187-.918-4.25 5.5 1.188.918Z"
        fill="currentColor"
      />
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Plan({
  name,
  price,
  description,
  button,
  features,
  activePeriod,
  logo,
  logomarkClassName,
  featured = false,
}: {
  name: string
  price: {
    Monthly: string
    Annually: string
  }
  logo: React.ReactNode
  description: string
  button: {
    label: string
    href: string
  }
  features: Array<string>
  activePeriod: 'Monthly' | 'Annually'
  logomarkClassName?: string
  featured?: boolean
}) {
  return (
    <section
      className={clsx(
        'flex flex-col overflow-hidden rounded-3xl p-6 shadow-lg shadow-gray-900/5 transition-all duration-300 hover:scale-105',
        featured
          ? 'order-first bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ring-2 ring-purple-500 lg:order-none'
          : 'bg-gray-800/50 backdrop-blur-xl'
      )}
    >
      <h3
        className={clsx(
          'flex items-center text-sm font-semibold',
          featured ? 'text-purple-400' : 'text-gray-100'
        )}
      >
        {logo ? (
          logo
        ) : (
          <Logomark className={clsx('h-6 w-6 flex-none', logomarkClassName)} />
        )}
        <span className="ml-4">{name}</span>
      </h3>
      <p
        className={clsx(
          'relative mt-5 flex text-4xl font-bold tracking-tight',
          featured ? 'text-white' : 'text-gray-100'
        )}
      >
        {price.Monthly === price.Annually ? (
          price.Monthly
        ) : (
          <>
            <span
              aria-hidden={activePeriod === 'Annually'}
              className={clsx(
                'transition duration-300',
                activePeriod === 'Annually' &&
                  'pointer-events-none translate-x-6 opacity-0 select-none'
              )}
            >
              {price.Monthly}
            </span>
            <span
              aria-hidden={activePeriod === 'Monthly'}
              className={clsx(
                'absolute top-0 left-0 transition duration-300',
                activePeriod === 'Monthly' &&
                  'pointer-events-none -translate-x-6 opacity-0 select-none'
              )}
            >
              {price.Annually}
            </span>
          </>
        )}
      </p>
      <p
        className={clsx(
          'mt-3 text-sm',
          featured ? 'text-purple-200' : 'text-gray-400'
        )}
      >
        {description}
      </p>
      <div className="order-last mt-6">
        <ol
          className={clsx(
            '-my-2 divide-y text-sm',
            featured
              ? 'divide-gray-700/50 text-gray-300'
              : 'divide-gray-700/30 text-gray-300'
          )}
        >
          {features.map((feature) => (
            <li key={feature} className="flex py-2">
              <CheckIcon
                className={clsx(
                  'h-6 w-6 flex-none',
                  featured ? 'text-purple-400' : 'text-purple-500'
                )}
              />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ol>
      </div>
      <Button
        href={button.href}
        size={featured ? 'large' : 'middle'}
        color={featured ? 'danger' : 'default'}
        className={clsx(
          'mt-6',
          featured
            ? 'bg-purple-500 hover:bg-purple-400 text-gray-900 font-semibold'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
        )}
        aria-label={`Get started with the ${name} plan for ${price}`}
      >
        {button.label}
      </Button>
    </section>
  )
}

export function Pricing() {
  const [activePeriod, setActivePeriod] = useState<'Monthly' | 'Annually'>(
    'Monthly'
  )

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="border-t border-gray-800 bg-gradient-to-b from-gray-900 to-black py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="pricing-title"
            className="text-3xl font-medium tracking-tight text-gray-100"
          >
            Simple pricing for every Dota 2 streamer
          </h2>
          <p className="mt-2 text-lg text-gray-400">
            Whether you're just starting out or running a major channel, we have
            the tools to enhance your stream.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="relative">
            <RadioGroup
              value={activePeriod}
              onChange={setActivePeriod}
              className="grid grid-cols-2 bg-gray-800/50 p-1 rounded-lg"
            >
              {['Monthly', 'Annually'].map((period) => (
                <Radio
                  key={period}
                  value={period}
                  className={clsx(
                    'cursor-pointer px-8 py-2 text-sm transition-colors rounded-md',
                    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900',
                    activePeriod === period
                      ? 'bg-purple-500 text-gray-900 font-semibold shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700/50'
                  )}
                >
                  {period}
                </Radio>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 items-start gap-x-8 gap-y-10 sm:mt-20 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan) => (
            <Plan key={plan.name} {...plan} activePeriod={activePeriod} />
          ))}
        </div>
      </Container>
    </section>
  )
}
