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

export default function FeaturesPage() {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Features</title>
      </Head>
      <DashboardShell
        subtitle="Customize the options your stream receives."
        title="Features"
      >
        <Accordion multiple variant="separated" styles={accordionStyles}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-1 lg:grid-cols-2">
            <LanguageCard />
            <StreamDelayCard />
            <MmrTrackerCard />
            <BetsCard />
            <MinimapCard />
            <PicksCard />
            <RoshCard />
            <ChatterCard />
            <SceneSwitcher />
          </div>
        </Accordion>
      </DashboardShell>
    </>
  ) : null
}
