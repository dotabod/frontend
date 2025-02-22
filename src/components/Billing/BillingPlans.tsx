import {
  type PricePeriod,
  SUBSCRIPTION_TIERS,
  type SubscriptionStatus,
  getCurrentPeriod,
} from '@/utils/subscription'
import { StarOutlined } from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useState } from 'react'
import Plan from '../Plan'
import { PeriodToggle } from './PeriodToggle'
interface BillingPlansProps {
  subscription: SubscriptionStatus | null
  showTitle?: boolean
}

export const plans = [
  {
    name: 'Free',
    featured: false,
    price: { monthly: '$0', annual: '$0' },
    description:
      'Perfect for casual streamers who want to try out basic Dota 2 streaming features.',
    button: {
      label: 'Get started for free',
      href: `/register?plan=${SUBSCRIPTION_TIERS.FREE}`,
    },
    features: [
      'Multi-language support',
      'Basic minimap blocker',
      'Basic chat features: Turn off all chatters, match results',
      'Essential commands: !toggle, !mmr, !commands, !dotabod',
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
    name: 'Starter',
    featured: false,
    price: {
      monthly: '$3',
      annual: '$30',
    },
    description: 'Essential features for growing streamers who want core Dota 2 integration.',
    button: {
      label: 'Subscribe',
      href: `/register?plan=${SUBSCRIPTION_TIERS.STARTER}`,
    },
    features: [
      'All Free features',
      'Automated moderator setup',
      'MMR tracking',
      'Basic Twitch predictions',
      'Enhanced minimap and picks blockers',
      'Basic rank, MMR, and Roshan overlays',
      'Enhanced chat interactions: Bets, midas, first blood, aegis',
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
    price: {
      monthly: '$6',
      annual: '$57',
    },
    description:
      'Complete toolkit for serious streamers who need advanced features and automation.',
    button: {
      label: 'Subscribe',
      href: `/register?plan=${SUBSCRIPTION_TIERS.PRO}`,
    },
    features: [
      'All Starter features',
      'Automated 7tv, OBS, and Dota 2 setup',
      'Stream delay customization',
      'Advanced Twitch predictions with live overlay',
      'Advanced overlays: Minimap, picks, queue, notable players',
      'Win probability and full chat features',
      'OBS scene switcher',
      'Manager access',
      'All commands and features unlocked',
      <span key='beta-features' className='flex items-center gap-1'>
        <StarOutlined className='text-yellow-500' /> Early access to beta features and updates
      </span>,
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

export function BillingPlans({ subscription, showTitle = true }: BillingPlansProps) {
  const [activePeriod, setActivePeriod] = useState<PricePeriod>('monthly')
  const { data: session } = useSession()

  const period = getCurrentPeriod(subscription?.stripePriceId)

  if (session?.user?.isImpersonating) {
    return null
  }

  return (
    <div>
      {showTitle && (
        <div className='mx-auto max-w-2xl text-center'>
          <h2 className='text-3xl font-medium tracking-tight text-gray-100'>
            Simple pricing for every Dota 2 streamer
          </h2>
          {subscription && subscription.status === 'active' && (
            <p className='mt-2 text-lg text-purple-400'>
              You are currently on the{' '}
              {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} plan (
              {period})
            </p>
          )}
        </div>
      )}

      <div className='mt-8 flex justify-center'>
        <PeriodToggle
          activePeriod={activePeriod}
          onChange={setActivePeriod}
          subscription={subscription}
        />
      </div>

      <div className='mx-auto mt-16 grid max-w-2xl grid-cols-1 items-start gap-x-8 gap-y-10 sm:mt-20 lg:max-w-none lg:grid-cols-3'>
        {plans.map((plan) => (
          <Plan key={plan.name} {...plan} activePeriod={activePeriod} subscription={subscription} />
        ))}
      </div>
    </div>
  )
}
