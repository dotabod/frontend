import { DashboardHeader } from '@/components/dashboard-header'
import { DashboardShell } from '@/components/dashboard-shell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import DashboardLayout from '../DashboardLayout'
import { MinimapCard } from './MinimapCard'
import { PicksCard } from './PicksCard'
import { SceneSwitcher } from './SceneSwitcher'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const loading = status === 'loading'

  return !session ? null : (
    <>
      <Head>
        <title>Dotabod | Stream overlays</title>
      </Head>
      <DashboardLayout>
        <DashboardShell>
          <DashboardHeader
            heading="Features"
            text="Manage popular streamer features for your Dota game."
          />
          <div className="mb-11 grid gap-10">
            {/* <UserNameForm user={{ id: user?.id, name: user?.name }} /> */}
            <SceneSwitcher />
            <MinimapCard />
            <PicksCard />
          </div>
        </DashboardShell>
      </DashboardLayout>
    </>
  )
}
