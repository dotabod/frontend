import Head from 'next/head'
import type { ReactElement } from 'react'

import DashboardShell from '@/components/Dashboard/dashboard-shell'
import ChatterCard from '@/components/Dashboard/Features/chatter-card'
import NewFeatureChatToggles from '@/components/Dashboard/Features/new-feature-chat-toggles'
import Header from '@/components/Dashboard/header'
import ErrorBoundary from '@/components/error-boundary'
import { requireDashboardAccess } from '@/lib/server/dashboard-access'
import type { NextPageWithLayout } from '@/pages/_app'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Chat features</title>
    </Head>

    <Header
      subtitle='The bot reacts with chat messages to your game events as you play your match.'
      title='Chatter'
    />

    <div id='new-features' className='mb-6'>
      <ErrorBoundary>
        <NewFeatureChatToggles />
      </ErrorBoundary>
    </div>

    <div id='chatter'>
      <ErrorBoundary>
        <ChatterCard />
      </ErrorBoundary>
    </div>
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export const getServerSideProps = requireDashboardAccess()

export default FeaturesPage
