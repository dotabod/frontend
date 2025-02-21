'use client'

import { Container } from '@/components/Container'
import { Logomark } from '@/components/Logo'
import {
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { Radio, RadioGroup } from '@headlessui/react'
import { Button, Table, Tooltip, notification } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import clsx from 'clsx'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { signIn } from 'next-auth/react'
import { getPriceId } from '@/lib/stripe'
import { createCheckoutSession } from '@/lib/stripe'

const featureCategories = [
  {
    name: 'Setup & Configuration',
    features: [
      {
        name: 'Automated Setup',
        tooltip: 'Automatic configuration of various integrations',
        free: {
          value: 'Manual only',
          tooltip: 'Step-by-step setup guide provided',
        },
        starter: {
          value: 'Moderator setup (1)',
          tooltip: 'Automated Twitch moderator setup and basic configurations',
        },
        pro: {
          value: 'Full automation (4)',
          tooltip:
            'Complete automated setup of Twitch, OBS, 7TV, and Dota 2 integration',
        },
      },
      {
        name: '7TV Integration',
        tooltip: 'Automatic emote setup with 7TV',
        free: <CloseOutlined className="text-red-500" />,
        starter: <CloseOutlined className="text-red-500" />,
        pro: <CheckOutlined className="text-green-500" />,
      },
      {
        name: 'OBS Integration',
        tooltip: 'Automatic OBS scene setup and configuration',
        free: <CloseOutlined className="text-red-500" />,
        starter: <CloseOutlined className="text-red-500" />,
        pro: <CheckOutlined className="text-green-500" />,
      },
    ],
  },
  {
    name: 'Stream Protection',
    features: [
      {
        name: 'Minimap Blocker',
        tooltip: 'Prevents stream sniping via minimap',
        free: {
          value: 'Basic',
          tooltip: 'Simple semi-transparent overlay',
        },
        starter: {
          value: 'Enhanced',
          tooltip: 'Customizable opacity and background options',
        },
        pro: {
          value: 'Advanced + Custom',
          tooltip:
            'Full customization with multiple styles, positions, and automatic game state detection',
        },
      },
      {
        name: 'Pick Blocker',
        tooltip: 'Hides hero picks during draft phase',
        free: <CloseOutlined className="text-red-500" />,
        starter: {
          value: 'Basic',
          tooltip: 'Simple pick phase blocking',
        },
        pro: {
          value: 'Full phase control',
          tooltip:
            'Automatic phase detection with customizable overlays for each draft stage',
        },
      },
      {
        name: 'Stream Delay',
        tooltip: 'Customizable stream delay integration',
        free: <CloseOutlined className="text-red-500" />,
        starter: <CloseOutlined className="text-red-500" />,
        pro: 'Up to 30s',
      },
    ],
  },
  {
    name: 'Twitch Integration',
    features: [
      {
        name: 'Predictions',
        tooltip: 'Automated Twitch channel point predictions',
        free: <CloseOutlined className="text-red-500" />,
        starter: 'Basic',
        pro: 'Advanced + Overlay',
      },
      {
        name: 'Chat Features',
        tooltip: 'Interactive chat messages and events',
        free: {
          value: 'Basic',
          tooltip: 'Essential chat commands and match results',
        },
        starter: {
          value: 'Enhanced',
          tooltip:
            'Additional interactions: Bets, midas timing, first blood, aegis events',
        },
        pro: {
          value: 'Full features',
          tooltip:
            'Complete chat integration with all game events, items, and hero interactions',
        },
      },
      {
        name: 'MMR Tracking',
        tooltip: 'Track and display MMR changes',
        free: {
          value: 'Basic command',
          tooltip: 'Simple !mmr command to check current MMR',
        },
        starter: <CheckOutlined className="text-green-500" />,
        pro: {
          value: 'Advanced + Overlay',
          tooltip:
            'Live MMR tracking with customizable overlay and historical data',
        },
      },
    ],
  },
  {
    name: 'Additional Benefits',
    features: [
      {
        name: 'Beta Features Access',
        tooltip:
          'Get early access to new features and updates before they go live',
        free: <CloseOutlined className="text-red-500" />,
        starter: <CloseOutlined className="text-red-500" />,
        pro: (
          <span className="flex justify-center items-center gap-1">
            <StarOutlined className="text-yellow-500" /> Priority access
          </span>
        ),
      },
      {
        name: 'Feature Updates',
        tooltip: 'Automatic access to new features as they are released',
        free: 'Basic only',
        starter: 'Standard',
        pro: (
          <span className="flex justify-center items-center gap-1">
            <StarOutlined className="text-yellow-500" /> All features
          </span>
        ),
      },
    ],
  },
]

const plans = [
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

// Add this before the Plan component definition

function calculateSavings(monthlyPrice: string, annualPrice: string): number {
  const monthly = Number.parseFloat(monthlyPrice.replace('$', '')) * 12
  const annual = Number.parseFloat(annualPrice.replace('$', ''))
  return Math.round(((monthly - annual) / monthly) * 100)
}

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

type SubscriptionStatus = {
  tier: 'free' | 'starter' | 'pro'
  status: string
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
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
  subscription,
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
  features: Array<React.ReactNode>
  activePeriod: 'Monthly' | 'Annually'
  logomarkClassName?: string
  featured?: boolean
  subscription: SubscriptionStatus | null
}) {
  const { data: session } = useSession()
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false)
  const savings = calculateSavings(price.Monthly, price.Annually)

  // Get button text based on subscription status
  const getButtonText = () => {
    if (!subscription || subscription.status !== 'active') {
      return button.label
    }

    const currentTier = subscription.tier
    const targetTier = name.toLowerCase() as 'free' | 'starter' | 'pro'

    if (currentTier === targetTier) {
      return subscription.cancelAtPeriodEnd ? 'Reactivate' : 'Current plan'
    }

    const tierLevels = { free: 0, starter: 1, pro: 2 }
    return tierLevels[targetTier] > tierLevels[currentTier]
      ? 'Upgrade'
      : 'Downgrade'
  }

  // Disable button if it's current non-cancelled plan
  const isButtonDisabled =
    subscription?.status === 'active' &&
    subscription.tier === name.toLowerCase() &&
    !subscription.cancelAtPeriodEnd

  const handleSubscribe = async () => {
    setRedirectingToCheckout(true)
    try {
      if (!session) {
        await signIn('twitch', {
          callbackUrl: `/register?plan=${name.toLowerCase()}&period=${activePeriod.toLowerCase()}`,
        })
        return
      }

      // If user has an active subscription, update it instead of creating new checkout
      if (subscription?.status === 'active') {
        const priceId = getPriceId(
          name.toLowerCase() as 'starter' | 'pro',
          activePeriod.toLowerCase() as 'monthly' | 'annual'
        )

        const response = await fetch('/api/stripe/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        })

        if (!response.ok) {
          throw new Error('Failed to update subscription')
        }

        // Refresh the page to show updated subscription
        window.location.reload()
        return
      }

      // Otherwise, create new checkout session for new subscribers
      const priceId = getPriceId(
        name.toLowerCase() as 'starter' | 'pro',
        activePeriod.toLowerCase() as 'monthly' | 'annual'
      )
      const response = await createCheckoutSession(priceId, session.user.id)

      if (!response.url) {
        throw new Error('Failed to create checkout session')
      }

      window.location.href = response.url
    } catch (error) {
      console.error('Subscription error:', error)
      notification.error({
        message: 'Subscription Error',
        description:
          'Failed to process subscription change. Please try again later.',
        placement: 'bottomRight',
      })
    } finally {
      setRedirectingToCheckout(false)
    }
  }

  return (
    <section
      className={clsx(
        'flex flex-col overflow-hidden rounded-3xl p-6 shadow-lg shadow-gray-900/5',
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
              <span className="text-sm"> / month</span>
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
              <span className="text-sm"> / year</span>
            </span>
          </>
        )}
      </p>
      {activePeriod === 'Annually' && !Number.isNaN(savings) && (
        <p
          className={clsx(
            '-mt-10 text-sm',
            featured ? 'text-purple-200' : 'text-gray-400'
          )}
        >
          Saving {savings}%
        </p>
      )}
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
          {features.map((feature, index) => (
            <li key={index} className="flex py-2">
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
        loading={redirectingToCheckout}
        onClick={handleSubscribe}
        size={featured ? 'large' : 'middle'}
        color={featured ? 'danger' : 'default'}
        disabled={isButtonDisabled}
        className={clsx(
          'mt-6',
          featured
            ? 'bg-purple-500 hover:bg-purple-400 text-gray-900 font-semibold'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-100',
          isButtonDisabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={`Get started with the ${name} plan for ${price[activePeriod]}`}
      >
        {getButtonText()}
      </Button>
    </section>
  )
}

function FeatureComparison() {
  interface FeatureValue {
    value: string
    tooltip: string
  }

  interface Feature {
    name: string
    tooltip: string
    free: React.ReactNode | FeatureValue
    starter: React.ReactNode | FeatureValue
    pro: React.ReactNode | FeatureValue
  }

  interface TableItem extends Feature {
    key: string
    category: string
  }

  const flattenedData: TableItem[] = featureCategories.flatMap((category) =>
    category.features.map((feature) => ({
      key: `${category.name}-${feature.name}`,
      category: category.name,
      ...feature,
    }))
  )

  const columns: ColumnsType<TableItem> = [
    {
      title: 'Feature',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TableItem) => (
        <div className="flex items-center">
          {text}
          <Tooltip title={record.tooltip}>
            <InfoCircleOutlined className="ml-2 text-gray-500 hover:text-gray-300" />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Free',
      dataIndex: 'free',
      key: 'free',
      align: 'center',
      render: (value: React.ReactNode | FeatureValue | null) =>
        value && typeof value === 'object' && 'value' in value ? (
          <Tooltip title={value.tooltip}>
            <span className="cursor-help">{value.value}</span>
          </Tooltip>
        ) : (
          value
        ),
    },
    {
      title: 'Starter',
      dataIndex: 'starter',
      key: 'starter',
      align: 'center',
      render: (value: React.ReactNode | FeatureValue | null) =>
        value && typeof value === 'object' && 'value' in value ? (
          <Tooltip title={value.tooltip}>
            <span className="cursor-help">{value.value}</span>
          </Tooltip>
        ) : (
          value
        ),
    },
    {
      title: 'Pro',
      dataIndex: 'pro',
      key: 'pro',
      align: 'center',
      render: (value: React.ReactNode | FeatureValue | null) =>
        value && typeof value === 'object' && 'value' in value ? (
          <Tooltip title={value.tooltip}>
            <span className="cursor-help">{value.value}</span>
          </Tooltip>
        ) : (
          value
        ),
    },
  ]

  const demoImages = {
    'Minimap Blocker': {
      image: '/images/overlay/minimap/738-Complex-Large-AntiStreamSnipeMap.png',
      width: 240,
      height: 240,
      caption: 'Minimap blocker overlay example',
    },
    'Pick Blocker': {
      image: '/images/overlay/picks/block-radiant-picks.png',
      width: 600,
      height: 600,
      caption: 'Pick blocker during draft phase',
    },
    'Twitch Predictions': {
      image: 'https://i.imgur.com/8ZsUxJR.png',
      width: 425,
      height: 168,
      caption: 'Twitch predictions integration',
    },
    'Roshan Timer': {
      image: '/images/dashboard/rosh-timer.png',
      width: 336,
      height: 249,
      caption: 'Roshan timer overlay',
    },
  }

  return (
    <div className="mt-16">
      <div className="px-6 py-4 bg-gray-900/50 rounded-t-lg">
        <h3 className="text-xl font-semibold text-gray-100">
          Feature Comparison
        </h3>
      </div>
      <Table
        columns={columns}
        dataSource={flattenedData}
        pagination={false}
        className="pricing-table"
        rowClassName={(record) =>
          `pricing-table-row category-${record.category}`
        }
        size="middle"
        bordered
        expandable={{
          expandedRowRender: (record) => (
            <div className="px-4 py-6 space-y-4">
              <p className="text-gray-400">{record.tooltip}</p>
              {demoImages[record.name] && (
                <div className="flex flex-col items-center space-y-2">
                  <Image
                    src={demoImages[record.name].image}
                    width={demoImages[record.name].width}
                    height={demoImages[record.name].height}
                    alt={record.name}
                    className="rounded-lg"
                  />
                  <span className="text-sm text-gray-500">
                    {demoImages[record.name].caption}
                  </span>
                </div>
              )}
            </div>
          ),
          rowExpandable: (record) => true,
        }}
        showHeader={true}
        rowKey="key"
      />
    </div>
  )
}

export function Pricing() {
  const [activePeriod, setActivePeriod] = useState<'Monthly' | 'Annually'>(
    'Monthly'
  )
  const { data: session } = useSession()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null
  )
  useEffect(() => {
    async function getSubscription() {
      if (session?.user?.id) {
        const response = await fetch('/api/stripe/subscription')
        if (response.ok) {
          const data = await response.json()
          setSubscription(data)
        }
      }
    }

    getSubscription()
  }, [session])

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
          {subscription && subscription.status === 'active' && (
            <p className="mt-2 text-lg text-purple-400">
              You are currently on the{' '}
              {subscription.tier.charAt(0).toUpperCase() +
                subscription.tier.slice(1)}{' '}
              plan
              {subscription.cancelAtPeriodEnd &&
                ` (cancels ${new Date(subscription.currentPeriodEnd!).toLocaleDateString()})`}
            </p>
          )}
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
                    'cursor-pointer px-8 py-2 text-sm transition-colors rounded-md flex items-center gap-2',
                    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900',
                    activePeriod === period
                      ? 'bg-purple-500 text-gray-900 font-semibold shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700/50'
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    {period}
                    {period === 'Annually' && (
                      <div
                        className={clsx(
                          'absolute -bottom-6 text-xs whitespace-nowrap',
                          activePeriod === period
                            ? 'text-purple-400'
                            : 'text-purple-300'
                        )}
                      >
                        Save up to{' '}
                        {Math.max(
                          ...plans
                            .filter((plan) => plan.price.Monthly !== '$0')
                            .map((plan) =>
                              calculateSavings(
                                plan.price.Monthly,
                                plan.price.Annually
                              )
                            )
                        )}
                        %
                      </div>
                    )}
                  </div>
                </Radio>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 items-start gap-x-8 gap-y-10 sm:mt-20 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan) => (
            <Plan
              key={plan.name}
              {...plan}
              activePeriod={activePeriod}
              subscription={subscription}
            />
          ))}
        </div>
      </Container>
    </section>
  )
}
