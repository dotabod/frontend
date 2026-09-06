import Head from 'next/head'
import type { ReactElement } from 'react'

import DashboardShell from '@/components/Dashboard/dashboard-shell'
import AutoTranslateCard from '@/components/Dashboard/Features/auto-translate-card'
import MinimapCard from '@/components/Dashboard/Features/minimap-card'
import NotablePlayersCard from '@/components/Dashboard/Features/notable-players'
import PicksCard from '@/components/Dashboard/Features/picks-card'
import QueueCard from '@/components/Dashboard/Features/queue-card'
import RoshCard from '@/components/Dashboard/Features/rosh-card'
import Header from '@/components/Dashboard/header'
import ErrorBoundary from '@/components/error-boundary'
import BetsOverlay from '@/components/Overlay/bets-overlay'
import LastFmOverlay from '@/components/Overlay/last-fm-overlay'
import MmrOverlay from '@/components/Overlay/mmr-overlay'
import WinLossOverlay from '@/components/Overlay/win-loss-overlay'
import WinProbabilityOverlay from '@/components/Overlay/win-probability-overlay'
import { requireDashboardAccess } from '@/lib/server/dashboard-access'
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
