import clsx from 'clsx'

import { Button } from 'antd'
import Image from 'next/image'
import { Container } from 'src/components/Container'
import { Logomark } from 'src/components/Logo'

const plans = [
  {
    name: 'Casual',
    featured: false,
    price: { Monthly: '$0', Annually: '$0' },
    description:
      'You’ve been streaming for a while. Stream more with Dotabod and grow your gaming time.',
    button: {
      label: 'Get started',
      href: '/dashboard',
    },
    features: [
      "It's literally free",
      'Picks blocker',
      'OBS scene changer',
      'Minimap blocker',
      'Twitch predictions',
      'MMR tracking',
    ],
    logo: (
      <Image
        src="https://cdn.betterttv.net/emote/58cd3345994bb43c8d300b82/3x.webp"
        width={24}
        height={24}
        alt="Krappa"
      />
    ),
    logomarkClassName: 'fill-gray-500',
  },
  {
    name: 'Gigachad',
    featured: true,
    price: { Monthly: '$5-$25', Annually: '$5' },
    description:
      'You’re a good person. You know Dotabod is free but you want to support the project anyway ❤.',
    button: {
      label: 'Support the project',
      href: 'https://ko-fi.com/dotabod',
    },
    features: [
      'Everything in free tier',
      'Exclusive Discord badge',
      'Logo or name visible on Dotabod.com',
      'Logo or name visible on project Github',
      'Access to pre-release builds',
      'Have your bug reports prioritized',
      'Access to personal Discord to DM dev',
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
    logomarkClassName: 'fill-gray-500',
  },
]

function CheckIcon(props) {
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
  logo,
  name,
  price,
  description,
  button,
  features,
  featured = false,
  activePeriod,
  logomarkClassName,
}) {
  return (
    <section
      className={clsx(
        'flex flex-col overflow-hidden rounded-3xl p-6 shadow-lg shadow-gray-900/5',
        featured
          ? 'order-first border border-blue-900/80 bg-blue-900/10 shadow shadow-blue-700 lg:order-none'
          : 'bg-gray-800'
      )}
    >
      <h3
        className={clsx(
          'flex items-center text-sm font-semibold',
          featured ? 'text-white' : 'text-gray-200'
        )}
      >
        {logo ? (
          logo
        ) : (
          <Logomark
            className={clsx('h-6 w-auto flex-none', logomarkClassName)}
          />
        )}
        <span className="ml-4">{name}</span>
      </h3>
      <p
        className={clsx(
          'relative mt-5 flex text-3xl tracking-tight',
          featured ? 'text-white' : 'text-gray-200'
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
                  'pointer-events-none translate-x-6 select-none opacity-0'
              )}
            >
              {price.Monthly}
            </span>
            <span
              aria-hidden={activePeriod === 'Monthly'}
              className={clsx(
                'absolute left-0 top-0 transition duration-300',
                activePeriod === 'Monthly' &&
                  'pointer-events-none -translate-x-6 select-none opacity-0'
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
          featured ? 'text-gray-300' : 'text-gray-300'
        )}
      >
        {description}
      </p>
      <div className="order-last mt-6">
        <ul
          role="list"
          className={clsx(
            '-my-2 divide-y text-sm',
            featured
              ? 'divide-blue-800 text-gray-300'
              : 'divide-gray-700 text-gray-300'
          )}
        >
          {features.map((feature) => (
            <li key={feature} className="flex py-2">
              <CheckIcon
                className={clsx(
                  'h-6 w-6 flex-none',
                  featured ? 'text-blue-500' : 'text-gray-300'
                )}
              />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      {button.custom && (
        <button.custom
          trigger={
            <Button
              color={featured ? 'cyan' : 'gray'}
              className="mt-6"
              aria-label={`Get started with the ${name} plan for ${price}`}
            >
              {button.label}
            </Button>
          }
        />
      )}
      {!button.custom && (
        <Button
          href={button.href}
          size="large"
          type={featured ? 'primary' : 'default'}
          className="mt-6"
          aria-label={`Get started with the ${name} plan for ${price}`}
        >
          {button.label}
        </Button>
      )}
    </section>
  )
}

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="border-t border-gray-500 bg-gray-900 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-lg text-center">
          <h2
            id="pricing-title"
            className="text-3xl font-medium tracking-tight text-gray-200"
          >
            Flat pricing, no management fees.
          </h2>
          <p className="mt-2 text-lg text-gray-300">
            Whether you’re one person trying to get ahead or a big firm trying
            to take over the world, we’ve got a plan for you.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 items-start gap-x-8 gap-y-10 sm:mt-20 md:grid-cols-2">
          {plans.map((plan) => (
            <Plan key={plan.name} {...plan} activePeriod="Monthly" />
          ))}
        </div>
      </Container>
    </section>
  )
}
