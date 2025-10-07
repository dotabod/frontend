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
import BetsOverlay from '@/components/Overlay/BetsOverlay'
import { GiftAlertOverlayForDashboard } from '@/components/Overlay/GiftAlertOverlay'
import LastFmOverlay from '@/components/Overlay/LastFmOverlay'
import MmrOverlay from '@/components/Overlay/MmrOverlay'
import WinLossOverlay from '@/components/Overlay/WinLossOverlay'
import WinProbabilityOverlay from '@/components/Overlay/WinProbabilityOverlay'
import type { NextPageWithLayout } from '@/pages/_app'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Overlay features</title>
    </Head>

    <Header subtitle='Enhance your stream with these overlay features' title='Overlay' />

    <div className='grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2'>
      <div id='minimap'>
        <MinimapCard />
      </div>
      <div id='picks'>
        <PicksCard />
      </div>
      <div id='wl'>
        <WinLossOverlay />
      </div>
      <div id='win-probability'>
        <WinProbabilityOverlay />
      </div>
      <div id='mmr-overlay'>
        <MmrOverlay />
      </div>
      <div id='bets-overlay'>
        <BetsOverlay />
      </div>
      <div id='rosh'>
        <RoshCard />
      </div>
      <div id='queue-blocker'>
        <QueueCard />
      </div>
      <div id='notable-players'>
        <NotablePlayersCard />
      </div>
      <div id='gift-alert'>
        <GiftAlertOverlayForDashboard />
      </div>
      <div id='lastfm'>
        <LastFmOverlay />
      </div>
      <div id='auto-translate'>
        <AutoTranslateCard />
      </div>
    </div>
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
