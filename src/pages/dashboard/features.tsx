import { accordionStyles } from '@/components/accordionStyles'
import BetsCard from '@/components/Dashboard/Features/BetsCard'
import ChatterCard from '@/components/Dashboard/Features/ChatterCard'
import MinimapCard from '@/components/Dashboard/Features/MinimapCard'
import MmrTrackerCard from '@/components/Dashboard/Features/MmrTrackerCard'
import PicksCard from '@/components/Dashboard/Features/PicksCard'
import RoshCard from '@/components/Dashboard/Features/RoshCard'
import SceneSwitcher from '@/components/Dashboard/Features/SceneSwitcher'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { Accordion } from '@mantine/core'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import LanguageCard from '@/components/Dashboard/Features/LanguageCard'
import StreamDelayCard from '@/components/Dashboard/Features/StreamDelay'
import NotablePlayersCard from '@/components/Dashboard/Features/NotablePlayers'
import ComingSoonCard from '@/components/Dashboard/Features/ComingSoonCard'
import { ReactElement } from 'react'
import type { NextPageWithLayout } from '@/pages/_app'
import Header from '@/components/Dashboard/Header'

const FeaturesPage: NextPageWithLayout = () => {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Features</title>
      </Head>

      <Header
        subtitle="Customize the options your stream receives."
        title="Features"
      />

      <Accordion multiple variant="separated" styles={accordionStyles}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-1 lg:grid-cols-2">
          <LanguageCard />
          <StreamDelayCard />
          <NotablePlayersCard />
          <ComingSoonCard />
        </div>
      </Accordion>
      <Accordion multiple variant="separated" styles={accordionStyles}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-1 lg:grid-cols-2">
          <MmrTrackerCard />
          <BetsCard />
          <MinimapCard />
          <PicksCard />
          <RoshCard />
          <ChatterCard />
          <SceneSwitcher />
        </div>
      </Accordion>
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
