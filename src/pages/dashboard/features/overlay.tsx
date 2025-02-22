import DashboardShell from '@/components/Dashboard/DashboardShell'
import MinimapCard from '@/components/Dashboard/Features/MinimapCard'
import NotablePlayersCard from '@/components/Dashboard/Features/NotablePlayers'
import PicksCard from '@/components/Dashboard/Features/PicksCard'
import QueueCard from '@/components/Dashboard/Features/QueueCard'
import RoshCard from '@/components/Dashboard/Features/RoshCard'
import Header from '@/components/Dashboard/Header'
import BetsOverlay from '@/components/Overlay/BetsOverlay'
import MmrOverlay from '@/components/Overlay/MmrOverlay'
import WinLossOverlay from '@/components/Overlay/WinLossOverlay'
import WinProbabilityOverlay from '@/components/Overlay/WinProbabilityOverlay'
import type { NextPageWithLayout } from '@/pages/_app'
import Head from 'next/head'
import type { ReactElement } from 'react'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Overlay features</title>
    </Head>

    <Header subtitle='Enhance your stream with these overlay features' title='Overlay' />

    <div className='grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2'>
      <MinimapCard />
      <PicksCard />
      <WinLossOverlay />
      <WinProbabilityOverlay />
      <MmrOverlay />
      <BetsOverlay />
      <RoshCard />
      <QueueCard />
      <NotablePlayersCard />
    </div>
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
