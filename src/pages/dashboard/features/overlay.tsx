import Head from 'next/head'
import type { ReactElement } from 'react'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import AutoTranslateCard from '@/components/Dashboard/Features/AutoTranslateCard'
import MinimapCard from '@/components/Dashboard/Features/MinimapCard'
import NotablePlayersCard from '@/components/Dashboard/Features/NotablePlayers'
import PicksCard from '@/components/Dashboard/Features/PicksCard'
import QueueCard from '@/components/Dashboard/Features/QueueCard'
import RoshCard from '@/components/Dashboard/Features/RoshCard'
import Header from '@/components/Dashboard/Header'
import ErrorBoundary from '@/components/ErrorBoundary'
import BetsOverlay from '@/components/Overlay/BetsOverlay'
import LastFmOverlay from '@/components/Overlay/LastFmOverlay'
import MmrOverlay from '@/components/Overlay/MmrOverlay'
import WinLossOverlay from '@/components/Overlay/WinLossOverlay'
import WinProbabilityOverlay from '@/components/Overlay/WinProbabilityOverlay'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import type { NextPageWithLayout } from '@/pages/_app'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Overlay features</title>
    </Head>

    <Header subtitle='Enhance your stream with these overlay features' title='Overlay' />

    <div className='grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2'>
      <div id='minimap'>
        <ErrorBoundary>
          <MinimapCard />
        </ErrorBoundary>
      </div>
      <div id='picks'>
        <ErrorBoundary>
          <PicksCard />
        </ErrorBoundary>
      </div>
      <div id='wl'>
        <ErrorBoundary>
          <WinLossOverlay />
        </ErrorBoundary>
      </div>
      <div id='win-probability'>
        <ErrorBoundary>
          <WinProbabilityOverlay />
        </ErrorBoundary>
      </div>
      <div id='mmr-overlay'>
        <ErrorBoundary>
          <MmrOverlay />
        </ErrorBoundary>
      </div>
      <div id='bets-overlay'>
        <ErrorBoundary>
          <BetsOverlay />
        </ErrorBoundary>
      </div>
      <div id='rosh'>
        <ErrorBoundary>
          <RoshCard />
        </ErrorBoundary>
      </div>
      <div id='queue-blocker'>
        <ErrorBoundary>
          <QueueCard />
        </ErrorBoundary>
      </div>
      <div id='notable-players'>
        <ErrorBoundary>
          <NotablePlayersCard />
        </ErrorBoundary>
      </div>
      <div id='lastfm'>
        <ErrorBoundary>
          <LastFmOverlay />
        </ErrorBoundary>
      </div>
      <div id='auto-translate'>
        <ErrorBoundary>
          <AutoTranslateCard />
        </ErrorBoundary>
      </div>
    </div>
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export const getServerSideProps = requireDashboardAccess()

export default FeaturesPage
