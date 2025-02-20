'use client'

import { useState } from 'react'
import { Radio, RadioGroup } from '@headlessui/react'
import clsx from 'clsx'
import Image from 'next/image'
import { Button, Tooltip } from 'antd'
import { Container } from '@/components/Container'
import { Logomark } from '@/components/Logo'
import { InfoCircleOutlined } from '@ant-design/icons'

const plans = [
  {
    name: 'Free',
    featured: false,
    price: { Monthly: '$0', Annually: '$0' },
    description:
      'Perfect for casual streamers who want to try out basic Dota 2 streaming features.',
    button: {
      label: 'Get started for free',
      href: '/register',
    },
    features: [
      'Multi-language support (English)',
      'Basic minimap blocker',
      'Basic picks blocker',
      'Basic chat features: Turn off all chatters, match results',
      'Essential commands: !toggle, !mmr, !commands, !dotabod',
    ],
    logo: (
      <Image
        src='https://cdn.betterttv.net/emote/58cd3345994bb43c8d300b82/3x.webp'
        width={24}
        height={24}
        alt='Free'
      />
    ),
    logomarkClassName: 'fill-gray-300',
  },
  {
    name: 'Starter',
    featured: false,
    price: { Monthly: '$3.99', Annually: '$40' },
    description: 'Essential features for growing streamers who want core Dota 2 integration.',
    button: {
      label: 'Subscribe',
      href: '/register',
    },
    features: [
      'All Free features',
      'Automated moderator setup',
      'Automated 7tv and OBS setup',
      'Expanded language support (3 languages)',
      'MMR tracking',
      'Basic Twitch predictions',
      'Enhanced minimap and picks blockers',
      'Basic rank, MMR, and Roshan overlays',
      'Enhanced chat interactions: Bets, MMR changes, midas, pause, first blood, aegis',
      'Additional commands: !online, !mute, !wl, !ranked, !rosh, !delay',
    ],
    logo: (
      <Image
        src='https://cdn.betterttv.net/emote/61f2f17c06fd6a9f5be2630a/3x.webp'
        width={24}
        height={24}
        className='rounded'
        alt='Starter'
      />
    ),
    logomarkClassName: 'fill-gray-500',
  },
  {
    name: 'Pro',
    featured: true,
    price: { Monthly: '$6.99', Annually: '$70' },
    description:
      'Complete toolkit for serious streamers who need advanced features and automation.',
    button: {
      label: 'Subscribe',
      href: '/register',
    },
    features: [
      'All Starter features',
      'Automated Dota 2 client setup',
      'Full language support (5 languages or custom)',
      'Stream delay customization',
      'Advanced Twitch predictions with live overlay',
      'Advanced minimap, picks, and queue blockers',
      'Notable players and win probability overlays',
      'Full chat features: All item, hero, and event interactions',
      'OBS scene switcher',
      'Manager access',
      'All commands',
    ],
    logo: (
      <Image
        src='https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp'
        width={24}
        height={24}
        className='rounded'
        alt='Pro'
      />
    ),
    logomarkClassName: 'fill-purple-500',
  },
]
function CheckIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' {...props}>
      <path
        d='M9.307 12.248a.75.75 0 1 0-1.114 1.004l1.114-1.004ZM11 15.25l-.557.502a.75.75 0 0 0 1.15-.043L11 15.25Zm4.844-5.041a.75.75 0 0 0-1.188-.918l1.188.918Zm-7.651 3.043 2.25 2.5 1.114-1.004-2.25-2.5-1.114 1.004Zm3.4 2.457 4.25-5.5-1.187-.918-4.25 5.5 1.188.918Z'
        fill='currentColor'
      />
      <circle
        cx='12'
        cy='12'
        r='8.25'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
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
          : 'bg-gray-800/50 backdrop-blur-xl',
      )}
    >
      <h3
        className={clsx(
          'flex items-center text-sm font-semibold',
          featured ? 'text-purple-400' : 'text-gray-100',
        )}
      >
        {logo ? logo : <Logomark className={clsx('h-6 w-6 flex-none', logomarkClassName)} />}
        <span className='ml-4'>{name}</span>
      </h3>
      <p
        className={clsx(
          'relative mt-5 flex text-4xl font-bold tracking-tight',
          featured ? 'text-white' : 'text-gray-100',
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
                  'pointer-events-none translate-x-6 opacity-0 select-none',
              )}
            >
              {price.Monthly}
            </span>
            <span
              aria-hidden={activePeriod === 'Monthly'}
              className={clsx(
                'absolute top-0 left-0 transition duration-300',
                activePeriod === 'Monthly' &&
                  'pointer-events-none -translate-x-6 opacity-0 select-none',
              )}
            >
              {price.Annually}
            </span>
          </>
        )}
      </p>
      <p className={clsx('mt-3 text-sm', featured ? 'text-purple-200' : 'text-gray-400')}>
        {description}
      </p>
      <div className='order-last mt-6'>
        <ol
          className={clsx(
            '-my-2 divide-y text-sm',
            featured ? 'divide-gray-700/50 text-gray-300' : 'divide-gray-700/30 text-gray-300',
          )}
        >
          {features.map((feature) => (
            <li key={feature} className='flex py-2'>
              <CheckIcon
                className={clsx(
                  'h-6 w-6 flex-none',
                  featured ? 'text-purple-400' : 'text-purple-500',
                )}
              />
              <span className='ml-4'>{feature}</span>
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
            : 'bg-gray-700 hover:bg-gray-600 text-gray-100',
        )}
        aria-label={`Get started with the ${name} plan for ${price}`}
      >
        {button.label}
      </Button>
    </section>
  )
}

// New component for feature comparison
function FeatureComparison() {
  const featureCategories = [
    {
      name: 'Setup',
      features: [
        {
          name: 'Automated Setup',
          tooltip: 'Automatic configuration of Twitch, OBS, and Dota 2 integration',
          free: '❌',
          starter: 'Basic',
          pro: 'Full',
        },
        {
          name: '7TV Integration',
          tooltip: 'Automatic emote setup with 7TV',
          free: '❌',
          starter: '❌',
          pro: '✅',
        },
      ],
    },
    {
      name: 'Overlay Features',
      features: [
        {
          name: 'Minimap Blocker',
          tooltip: 'Prevents stream snipers from seeing your minimap',
          free: 'Basic',
          starter: 'Enhanced',
          pro: 'Advanced',
        },
        {
          name: 'Pick Blocker',
          tooltip: 'Hides hero picks during draft phase',
          free: '❌',
          starter: 'Basic',
          pro: 'Advanced',
        },
      ],
    },
    // Add more categories and features...
  ]

  return (
    <div className='mt-16 overflow-hidden rounded-lg bg-gray-800/50 backdrop-blur-xl'>
      <div className='px-6 py-4 bg-gray-900/50'>
        <h3 className='text-xl font-semibold text-gray-100'>Feature Comparison</h3>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-gray-700/50'>
              <th className='py-4 px-6 text-left text-gray-300'>Feature</th>
              <th className='py-4 px-6 text-center text-gray-300'>Free</th>
              <th className='py-4 px-6 text-center text-gray-300'>Starter</th>
              <th className='py-4 px-6 text-center text-gray-300'>Pro</th>
            </tr>
          </thead>
          <tbody>
            {featureCategories.map((category) => (
              <>
                <tr key={category.name} className='bg-gray-900/30'>
                  <td colSpan={4} className='py-2 px-6 font-medium text-purple-400'>
                    {category.name}
                  </td>
                </tr>
                {category.features.map((feature) => (
                  <tr
                    key={feature.name}
                    className='border-b border-gray-700/30 hover:bg-gray-700/20'
                  >
                    <td className='py-3 px-6 text-gray-300'>
                      <div className='flex items-center'>
                        {feature.name}
                        <Tooltip title={feature.tooltip}>
                          <InfoCircleOutlined className='ml-2 text-gray-500 hover:text-gray-300' />
                        </Tooltip>
                      </div>
                    </td>
                    <td className='py-3 px-6 text-center text-gray-300'>{feature.free}</td>
                    <td className='py-3 px-6 text-center text-gray-300'>{feature.starter}</td>
                    <td className='py-3 px-6 text-center text-gray-300'>{feature.pro}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Pricing() {
  const [activePeriod, setActivePeriod] = useState<'Monthly' | 'Annually'>('Monthly')

  return (
    <section
      id='pricing'
      aria-labelledby='pricing-title'
      className='border-t border-gray-800 bg-gradient-to-b from-gray-900 to-black py-20 sm:py-32'
    >
      <Container>
        <div className='mx-auto max-w-2xl text-center'>
          <h2 id='pricing-title' className='text-3xl font-medium tracking-tight text-gray-100'>
            Simple pricing for every Dota 2 streamer
          </h2>
          <p className='mt-2 text-lg text-gray-400'>
            Whether you're just starting out or running a major channel, we have the tools to
            enhance your stream.
          </p>
        </div>

        <div className='mt-8 flex justify-center'>
          <div className='relative'>
            <RadioGroup
              value={activePeriod}
              onChange={setActivePeriod}
              className='grid grid-cols-2 bg-gray-800/50 p-1 rounded-lg'
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
                      : 'text-gray-300 hover:bg-gray-700/50',
                  )}
                >
                  {period}
                </Radio>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className='mx-auto mt-16 grid max-w-2xl grid-cols-1 items-start gap-x-8 gap-y-10 sm:mt-20 lg:max-w-none lg:grid-cols-3'>
          {plans.map((plan) => (
            <Plan key={plan.name} {...plan} activePeriod={activePeriod} />
          ))}
        </div>

        <FeatureComparison />
      </Container>
    </section>
  )
}
