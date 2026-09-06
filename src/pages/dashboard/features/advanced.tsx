import Head from 'next/head'
import Image from 'next/image'
import type { ReactElement } from 'react'

import DashboardShell from '@/components/Dashboard/dashboard-shell'
import { AutoCommandsCard } from '@/components/Dashboard/Features/auto-commands-card'
import ClippingCard from '@/components/Dashboard/Features/clipping-card'
import SceneSwitcher from '@/components/Dashboard/Features/scene-switcher'
import Header from '@/components/Dashboard/header'
import ErrorBoundary from '@/components/error-boundary'
import { requireDashboardAccess } from '@/lib/server/dashboard-access'
import type { NextPageWithLayout } from '@/pages/_app'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Advanced features</title>
    </Head>

    <Header
      subtitle={
        <div className='flex flex-row items-center space-x-2'>
          <span>Looking for even more? They&apos;ll be here</span>
          <Image
            src='https://cdn.7tv.app/emote/63071b80942ffb69e13d700f/1x.webp'
            width={24}
            height={24}
            alt='Krappa'
          />
        </div>
      }
      title='Advanced features'
    />

    <ErrorBoundary>
      <ClippingCard />
    </ErrorBoundary>
    <ErrorBoundary>
      <SceneSwitcher />
    </ErrorBoundary>
    <ErrorBoundary>
      <AutoCommandsCard />
    </ErrorBoundary>
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export const getServerSideProps = requireDashboardAccess()

export default FeaturesPage
