import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { Card } from '@/ui/card'
import { type PricePeriod, SUBSCRIPTION_TIERS, gracePeriodPrettyDate } from '@/utils/subscription'
import { StarOutlined } from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useState } from 'react'
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
    description:
      'Perfect for casual streamers who want to try out basic Dota 2 streaming features.',
    button: {
      label: 'Get started for free',
      href: `/dashboard/billing?plan=${SUBSCRIPTION_TIERS.FREE}`,
    },
    tier: SUBSCRIPTION_TIERS.FREE,
    features: [
      'Multi-language support',
      'Basic minimap blocker',
      'Basic game events in chat (kills, bounties, match outcome)',
      'Essential commands (!mmr, !wl, !ranked, !online, !spectators)',
      'Hero stats commands (!dotabuff, !opendota, !builds)',
      'Game stats commands (!gpm, !xpm, !apm)',
      'Basic rank display with MMR tracking',
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
    description:
      'Complete toolkit for serious streamers who need advanced features and automation.',
    button: {
      label: 'Subscribe',
      href: `/dashboard/billing?plan=${SUBSCRIPTION_TIERS.PRO}`,
    },
    features: [
      'All Free features',
      'Automated setup (Dota 2, OBS, 7TV, Twitch)',
      'Auto twitch predictions for each match',
      'Advanced overlays (Minimap XL, Anti-snipe blocker)',
      'Notable players overlay with flags',
      'Win probability overlay',
      'Live win probability (!wp)',
      'Stream delay customization',
      'OBS scene switcher',
      'Roshan timer and aegis tracking',
      'MMR tracking with each match',
      'Advanced game events (Midas, Rosh events, Neutral items)',
      'Pro commands (!hero, !np, !items, !gm, !smurfs)',
      'Manager access',
      <span key='beta-features' className='flex items-center gap-1'>
        <StarOutlined className='text-yellow-500' /> Early access to beta features and updates
      </span>,
    ],
    logo: (
      <Image
        src='https://cdn.betterttv.net/emote/5ff1bbbf9d7d952e405a2edc/3x.webp'
        width={24}
        height={24}
        className='rounded'
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

  const Wrapper = showTitle ? 'div' : Card

  return (
    <div>
      {showTitle && (
        <div className='mx-auto max-w-2xl text-center'>
          <h2 className='text-3xl font-medium tracking-tight text-gray-100'>
            Simple pricing for every Dota 2 streamer
          </h2>

          {inGracePeriod && !hasActivePlan ? (
            <>
              <p className='mt-2 text-lg text-yellow-400 font-medium'>
                Enjoy complimentary access to all Pro features until {gracePeriodPrettyDate}
              </p>
              <p className='mt-2 text-lg text-gray-400'>
                Subscribe today to continue using Pro features after the trial period ends
              </p>
            </>
          ) : hasActivePlan ? (
            <p className='mt-2 text-lg text-purple-400'>
              <SubscriptionStatus showAlert={false} />
            </p>
          ) : (
            <p className='mt-2 text-lg text-gray-400'>
              Choose the plan that best fits your streaming needs
            </p>
          )}
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

        <div className='mx-auto mt-16 grid max-w-2xl grid-cols-1 items-start gap-x-8 gap-y-10 sm:mt-20 lg:max-w-none lg:grid-cols-2'>
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
