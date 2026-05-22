import { StarOutlined } from '@ant-design/icons'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { gracePeriodPrettyDate, type PricePeriod, SUBSCRIPTION_TIERS } from '@/utils/subscription'
import Plan from '../Plan'
import { SubscriptionStatus } from '../Subscription/SubscriptionStatus'
import { PeriodToggle } from './PeriodToggle'

interface BillingPlansProps {
  showTitle?: boolean
}

export const plans = [
  {
    name: 'Free',
    featured: false,
    price: { monthly: '$0', annual: '$0', lifetime: '$0' },
    description: 'The core overlay, MMR tracking, and basic chat commands. No card required.',
    button: {
      label: 'Get started for free',
      href: `/dashboard/billing?plan=${SUBSCRIPTION_TIERS.FREE}`,
    },
    tier: SUBSCRIPTION_TIERS.FREE,
    features: [
      'Automated setup (Dota 2)',
      'Multi-language support',
      'Win-loss record display overlay',
      'MMR tracking with each match',
      'Basic rank display with mmr',
      'Basic minimap blocker',
      'Basic game events in chat (kills, bounties, match outcome)',
      'Essential commands (!mmr, !wl, !ranked, !online, !spectators)',
      'Hero stats commands (!dotabuff, !opendota, !builds)',
      'Game stats commands (!gpm, !xpm, !apm)',
      'Manual setup process',
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
    name: 'Pro',
    featured: true,
    hasTrial: true,
    price: {
      monthly: '$6',
      annual: '$57',
      lifetime: '$99',
    },
    tier: SUBSCRIPTION_TIERS.PRO,
    description: 'Everything in Free, plus auto predictions, advanced overlays, and pro commands.',
    button: {
      label: 'Subscribe',
      href: `/dashboard/billing?plan=${SUBSCRIPTION_TIERS.PRO}`,
    },
    features: [
      'All Free features',
      'Automated setup (OBS, 7TV, Twitch)',
      'Auto twitch predictions for each match',
      'Pro commands (!hero, !np, !items, !gm, !smurfs)',
      'Advanced overlays (XL Minimap, Anti-snipe blockers)',
      'Minimap blocker intensity control',
      'Notable players overlay with flags',
      'Win probability overlay with !wp command',
      'Stream delay customization',
      'Auto OBS scene switcher',
      'Auto Roshan and Aegis overlay timers and commands',
      'Spotify / Youtube integration (overlay and !song command)',
      'Advanced game events (Midas, Rosh events, Neutral items)',
      'Manager access',
      <span key='beta-features' className='flex items-center gap-1'>
        <StarOutlined className='text-yellow-500' /> Early access to beta features and updates
      </span>,
      'And more! Browse the full list of features in the dashboard',
    ],
    logo: (
      <Image
        src='https://cdn.betterttv.net/emote/5ff1bbbf9d7d952e405a2edc/3x.webp'
        width={24}
        height={24}
        className='rounded-sm'
        alt='Pro'
      />
    ),
    logomarkClassName: 'fill-purple-500',
  },
]

export function BillingPlans({ showTitle = true }: BillingPlansProps) {
  const [activePeriod, setActivePeriod] = useState<PricePeriod>('monthly')
  const { data: session } = useSession()
  const { subscription, inGracePeriod, hasActivePlan } = useSubscriptionContext()

  if (session?.user?.isImpersonating) {
    return null
  }

  const Wrapper = 'div'

  return (
    <div>
      {showTitle && (
        <div className='mx-auto mb-12 max-w-3xl text-center'>
          <h2
            id='pricing-title'
            className='text-balance text-4xl font-semibold leading-tight tracking-tight text-gray-100 sm:text-5xl'
          >
            Two plans. Free covers the basics, Pro covers the rest.
          </h2>

          {inGracePeriod && !hasActivePlan ? (
            <>
              <p className='mt-4 text-base font-medium text-amber-300'>
                You have free access to every Pro feature until {gracePeriodPrettyDate}.
              </p>
              <p className='mt-1 text-base text-gray-400'>
                Subscribe before then to keep Pro once the free window closes.
              </p>
            </>
          ) : hasActivePlan ? (
            <p className='mt-4 text-base text-purple-300'>
              <SubscriptionStatus />
            </p>
          ) : (
            <p className='mt-4 text-pretty text-base text-gray-400'>
              Start on Free, no card needed. Move up to Pro when you want the full kit.
            </p>
          )}

          <ul className='mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-gray-500'>
            <li>Free plan, no card needed</li>
            <li aria-hidden className='text-gray-700'>
              ·
            </li>
            <li>14 day free trial on Pro</li>
            <li aria-hidden className='text-gray-700'>
              ·
            </li>
            <li>Cancel anytime</li>
          </ul>
        </div>
      )}

      <Wrapper>
        <div className='mt-8 flex justify-center'>
          <PeriodToggle
            activePeriod={activePeriod}
            onChange={setActivePeriod}
            subscription={subscription}
          />
        </div>

        <div className='mx-auto mt-8 grid max-w-2xl grid-cols-1 items-start gap-6 lg:max-w-5xl lg:grid-cols-2 lg:gap-8'>
          {plans.map((plan) => (
            <Plan
              key={plan.name}
              {...plan}
              activePeriod={activePeriod}
              subscription={subscription}
            />
          ))}
        </div>
      </Wrapper>
    </div>
  )
}
