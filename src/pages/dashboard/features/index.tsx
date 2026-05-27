import Head from 'next/head'
import type { ReactElement } from 'react'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import BetsCard from '@/components/Dashboard/Features/BetsCard'
import IdeaCard from '@/components/Dashboard/Features/IdeaCard'
import LanguageCard from '@/components/Dashboard/Features/LanguageCard'
import MmrTrackerCard from '@/components/Dashboard/Features/MmrTrackerCard'
import { RankOnlyCard } from '@/components/Dashboard/Features/RankOnlyCard'
import StreamDelayCard from '@/components/Dashboard/Features/StreamDelay'
import Header from '@/components/Dashboard/Header'
import ErrorBoundary from '@/components/ErrorBoundary'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
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
