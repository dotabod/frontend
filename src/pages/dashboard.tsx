import { DashboardHeader } from '@/components/dashboard-header'
import { DashboardShell } from '@/components/dashboard-shell'
import DashboardLayout from '@/components/Dashboard/DashboardLayout'
import ExportCFG from '@/components/Dashboard/ExportCFG'
import OverlayURL from '@/components/Dashboard/OverlayURL'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

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
            heading="Setup"
            text="Browser overlays for your OBS."
          />
          <div className="mb-11 grid gap-10">
            <div className="space-y-12">
              <ExportCFG />
              <OverlayURL />
            </div>
          </div>
        </DashboardShell>
      </DashboardLayout>
    </>
  )
}
