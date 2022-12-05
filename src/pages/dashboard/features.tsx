import BetsCard from '@/components/Dashboard/Features/BetsCard'
import ChatterCard from '@/components/Dashboard/Features/ChatterCard'
import MinimapCard from '@/components/Dashboard/Features/MinimapCard'
import MmrTrackerCard from '@/components/Dashboard/Features/MmrTrackerCard'
import PicksCard from '@/components/Dashboard/Features/PicksCard'
import RoshCard from '@/components/Dashboard/Features/RoshCard'
import SceneSwitcher from '@/components/Dashboard/Features/SceneSwitcher'
import DashboardShell from '@/components/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

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
        <MmrTrackerCard />
        <BetsCard />
        <MinimapCard />
        <PicksCard />
        <RoshCard />
        <ChatterCard />
        <SceneSwitcher />
      </DashboardShell>
    </>
  ) : null
}
