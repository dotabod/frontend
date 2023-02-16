import MinimapCard from '@/components/Dashboard/Features/MinimapCard'
import PicksCard from '@/components/Dashboard/Features/PicksCard'
import RoshCard from '@/components/Dashboard/Features/RoshCard'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import NotablePlayersCard from '@/components/Dashboard/Features/NotablePlayers'
import { ReactElement } from 'react'
import type { NextPageWithLayout } from '@/pages/_app'
import Header from '@/components/Dashboard/Header'

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

      <div className="flex flex-col space-y-8">
        <MinimapCard />
        <PicksCard />
        <RoshCard />
        <NotablePlayersCard />
      </div>
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
