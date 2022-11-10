import ExportCFG from '@/components/Dashboard/ExportCFG'
import OverlayURL from '@/components/Dashboard/OverlayURL'
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
      <DashboardShell title="Setup">
        <ExportCFG />
        <OverlayURL />
      </DashboardShell>
    </>
  ) : null
}
