import DashboardShell from '@/components/Dashboard/DashboardShell'
import { signIn, useSession } from 'next-auth/react'
import Head from 'next/head'
import { ReactElement } from 'react'
import type { NextPageWithLayout } from '@/pages/_app'
import Header from '@/components/Dashboard/Header'
import { Card } from '@/ui/card'
import { Button, Switch, Tag } from 'antd'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import { CheckIcon, TwitchIcon, YoutubeIcon } from 'lucide-react'
import Discord from '@/images/logos/Discord'
import Kick from '@/images/logos/Kick'
import clsx from 'clsx'

const includedFeatures = [
  'Chatters',
  'Chat commands',
  'Game overlay',
  'OBS Scene Switching',
  'Automatic match betting',
  'Poll and bets overlay',
  'Online / offline detection',
]

const FeaturesPage: NextPageWithLayout = () => {
  const { status } = useSession()
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings['twitch-platform'])

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Simulcast</title>
      </Head>

      <Header
        subtitle="You can connect Dotabod to multiple platforms at once."
        title="Simulcast"
      />

      <Card>
        <div className="title">
          <h3 className="flex items-center space-x-4">
            <TwitchIcon size={20} />
            <span>Twitch</span>
          </h3>
        </div>

        <ul
          role="list"
          className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 sm:grid-cols-2 sm:gap-6"
        >
          {includedFeatures.map((feature) => (
            <li key={feature} className="flex gap-x-3">
              <CheckIcon
                className="h-6 w-5 flex-none text-purple-600"
                aria-hidden="true"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div>
          <Button
            type="primary"
            disabled
            loading={loading}
            block
            onClick={() => {
              signIn('twitch', {
                callbackUrl: '/dashboard/features/simulcast',
              })
            }}
          >
            {!isEnabled ? 'Connected' : 'Disconnect'}
          </Button>
        </div>
      </Card>
      <Card>
        <div className="title">
          <h3 className="flex items-center space-x-4">
            <YoutubeIcon size={20} />
            <span>YouTube</span>
          </h3>
        </div>

        <ul
          role="list"
          className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 sm:grid-cols-2 sm:gap-6"
        >
          {includedFeatures.map((feature, i) => (
            <li key={feature} className="flex gap-x-3">
              <CheckIcon
                className={clsx(
                  `h-6 w-5 flex-none`,
                  i >= 4 ? 'text-gray-500' : 'text-purple-600',
                )}
                aria-hidden="true"
              />
              <span className={clsx(i >= 4 && 'text-gray-500')}>{feature}</span>
            </li>
          ))}
        </ul>

        <div>
          <Button
            type="primary"
            loading={loading}
            block
            onClick={() => {
              signIn('google', {
                callbackUrl: '/dashboard/features/simulcast',
              })
            }}
          >
            {!isEnabled ? 'Connect' : 'Disconnect'}
          </Button>
        </div>
      </Card>
      <Card>
        <div className="title">
          <h3 className="flex items-center space-x-4">
            <Discord className="h-4 w-4" />
            <span>Discord</span>
            <Tag>Coming soon</Tag>
          </h3>
        </div>

        <ul
          role="list"
          className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 sm:grid-cols-2 sm:gap-6"
        >
          {includedFeatures.map((feature, i) => (
            <li key={feature} className="flex gap-x-3">
              <CheckIcon
                className={clsx(
                  `h-6 w-5 flex-none`,
                  i >= 4 ? 'text-gray-500' : 'text-purple-600',
                )}
                aria-hidden="true"
              />
              <span className={clsx(i >= 4 && 'text-gray-500')}>{feature}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <div className="title">
          <h3 className="flex items-center space-x-4">
            <Kick className="h-4 w-4" />
            <span>Kick</span>
            <Tag>Coming soon</Tag>
          </h3>
        </div>

        <ul
          role="list"
          className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 sm:grid-cols-2 sm:gap-6"
        >
          {includedFeatures.map((feature, i) => (
            <li key={feature} className="flex gap-x-3">
              <CheckIcon
                className={clsx(
                  `h-6 w-5 flex-none`,
                  i >= 4 ? 'text-gray-500' : 'text-purple-600',
                )}
                aria-hidden="true"
              />
              <span className={clsx(i >= 4 && 'text-gray-500')}>{feature}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
