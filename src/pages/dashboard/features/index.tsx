import Head from 'next/head'
import type { ReactElement } from 'react'

import DashboardShell from '@/components/Dashboard/dashboard-shell'
import BetsCard from '@/components/Dashboard/Features/bets-card'
import IdeaCard from '@/components/Dashboard/Features/idea-card'
import LanguageCard from '@/components/Dashboard/Features/language-card'
import MmrTrackerCard from '@/components/Dashboard/Features/mmr-tracker-card'
import NewFeaturesCard from '@/components/Dashboard/Features/new-features-card'
import { RankOnlyCard } from '@/components/Dashboard/Features/rank-only-card'
import StreamDelayCard from '@/components/Dashboard/Features/stream-delay'
import Header from '@/components/Dashboard/header'
import ErrorBoundary from '@/components/error-boundary'
import { requireDashboardAccess } from '@/lib/server/dashboard-access'
import type { NextPageWithLayout } from '@/pages/_app'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Main features</title>
    </Head>

    <Header subtitle='Customize the options your stream receives.' title='Main features' />

    <div className='grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2'>
      <div id='language'>
        <ErrorBoundary>
          <LanguageCard />
        </ErrorBoundary>
      </div>
      <div id='stream-delay'>
        <ErrorBoundary>
          <StreamDelayCard />
        </ErrorBoundary>
      </div>
      <div id='mmr-tracker'>
        <ErrorBoundary>
          <MmrTrackerCard />
        </ErrorBoundary>
      </div>
      <div id='bets'>
        <ErrorBoundary>
          <BetsCard />
        </ErrorBoundary>
      </div>
      <div id='rank-only'>
        <ErrorBoundary>
          <RankOnlyCard />
        </ErrorBoundary>
      </div>
      <div id='new-features'>
        <ErrorBoundary>
          <NewFeaturesCard />
        </ErrorBoundary>
      </div>
      <ErrorBoundary>
        <IdeaCard />
      </ErrorBoundary>
    </div>
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export const getServerSideProps = requireDashboardAccess()

export default FeaturesPage
