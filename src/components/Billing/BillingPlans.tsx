import { useState } from 'react'
import { PeriodToggle } from './PeriodToggle'
import type { SubscriptionStatus } from '@/utils/subscription'
import { StarOutlined } from '@ant-design/icons'
import Image from 'next/image'
import Plan from '../Plan'

interface BillingPlansProps {
  subscription: SubscriptionStatus | null
  onSubscriptionUpdate: (newSubscription: SubscriptionStatus) => void
  showTitle?: boolean
}

export const plans = [
  {
    name: 'Free',
    featured: false,
    price: { Monthly: '$0', Annually: '$0' },
    description:
      'Perfect for casual streamers who want to try out basic Dota 2 streaming features.',
    button: {
      label: 'Get started for free',
      href: '/register?plan=free',
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
        src="https://cdn.betterttv.net/emote/58cd3345994bb43c8d300b82/3x.webp"
        width={24}
        height={24}
        alt="Free"
      />
    ),
    logomarkClassName: 'fill-gray-300',
  },
  {
    name: 'Starter',
    featured: false,
    price: {
      Monthly: '$3',
      Annually: '$30',
    },
    description:
      'Essential features for growing streamers who want core Dota 2 integration.',
    button: {
      label: 'Subscribe',
      href: '/register?plan=starter',
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
        src="https://cdn.betterttv.net/emote/61f2f17c06fd6a9f5be2630a/3x.webp"
        width={24}
        height={24}
        className="rounded"
        alt="Starter"
      />
    ),
    logomarkClassName: 'fill-gray-500',
  },
  {
    name: 'Pro',
    featured: true,
    price: {
      Monthly: '$6',
      Annually: '$57',
    },
    description:
      'Complete toolkit for serious streamers who need advanced features and automation.',
    button: {
      label: 'Subscribe',
      href: '/register?plan=pro',
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
      <span key="beta-features" className="flex items-center gap-1">
        <StarOutlined className="text-yellow-500" /> Early access to beta
        features and updates
      </span>,
    ],
    logo: (
      <Image
        src="https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp"
        width={24}
        height={24}
        className="rounded"
        alt="Pro"
      />
    ),
    logomarkClassName: 'fill-purple-500',
  },
]

export function BillingPlans({
  subscription,
  onSubscriptionUpdate,
  showTitle = true,
}: BillingPlansProps) {
  const [activePeriod, setActivePeriod] = useState<'Monthly' | 'Annually'>(
    'Monthly'
  )

  return (
    <div>
      {showTitle && (
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-medium tracking-tight text-gray-100">
            Simple pricing for every Dota 2 streamer
          </h2>
          {subscription && subscription.status === 'active' && (
            <p className="mt-2 text-lg text-purple-400">
              You are currently on the{' '}
              {subscription.tier.charAt(0).toUpperCase() +
                subscription.tier.slice(1)}{' '}
              plan
            </p>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <PeriodToggle activePeriod={activePeriod} onChange={setActivePeriod} />
      </div>

      <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 items-start gap-x-8 gap-y-10 sm:mt-20 lg:max-w-none lg:grid-cols-3">
        {plans.map((plan) => (
          <Plan
            key={plan.name}
            {...plan}
            activePeriod={activePeriod}
            subscription={subscription}
            onSubscriptionUpdate={onSubscriptionUpdate}
          />
        ))}
      </div>
    </div>
  )
}
