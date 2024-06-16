import DashboardShell from '@/components/Dashboard/DashboardShell'
import MinimapCard from '@/components/Dashboard/Features/MinimapCard'
import NotablePlayersCard from '@/components/Dashboard/Features/NotablePlayers'
import PicksCard from '@/components/Dashboard/Features/PicksCard'
import QueueCard from '@/components/Dashboard/Features/QueueCard'
import RoshCard from '@/components/Dashboard/Features/RoshCard'
import Header from '@/components/Dashboard/Header'
import BetsOverlay from '@/components/Overlay/BetsOverlay'
import MmrOverlay from '@/components/Overlay/MmrOverlay'
import WinProbabilityOverlay from '@/components/Overlay/WinProbabilityOverlay'
import type { NextPageWithLayout } from '@/pages/_app'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'

const FeaturesPage: NextPageWithLayout = () => {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Overlay features</title>
      </Head>

      <Header
        subtitle="This stuff will show up on your stream"
        title="Overlay"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2">
        <MinimapCard />
        <PicksCard />
        <MmrOverlay />
        <BetsOverlay />
        <RoshCard />
        <QueueCard />
        <NotablePlayersCard />
        <WinProbabilityOverlay />
      </div>
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
