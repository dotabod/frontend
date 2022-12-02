import BetsCard from '@/components/Dashboard/Features/BetsCard'
import ChatterCard from '@/components/Dashboard/Features/ChatterCard'
import MinimapCard from '@/components/Dashboard/Features/MinimapCard'
import MmrTrackerCard from '@/components/Dashboard/Features/MmrTrackerCard'
import PicksCard from '@/components/Dashboard/Features/PicksCard'
import RoshCard from '@/components/Dashboard/Features/RoshCard'
import SceneSwitcher from '@/components/Dashboard/Features/SceneSwitcher'
import DashboardShell from '@/components/DashboardShell'
import { Setting } from '@prisma/client'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

type Props = {
  settings: Setting[]
}

export default function DashboardPage({ settings }: Props) {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
      </Head>
      <DashboardShell title="Features">
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
