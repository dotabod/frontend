import MinimapCard from '@/components/Dashboard/Features/MinimapCard'
import PicksCard from '@/components/Dashboard/Features/PicksCard'
import SceneSwitcher from '@/components/Dashboard/Features/SceneSwitcher'
import DashboardShell from '@/components/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

export default function DashboardPage() {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
      </Head>
      <DashboardShell title="Features">
        <SceneSwitcher />
        <MinimapCard />
        <PicksCard />
      </DashboardShell>
    </>
  ) : null
}
