import ExportCFG from '@/components/Dashboard/ExportCFG'
import ChatBot from '@/components/Dashboard/ChatBot'
import OverlayURL from '@/components/Dashboard/OverlayURL'
import DashboardShell from '@/components/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

export default function DashboardPage() {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Setup</title>
      </Head>
      <DashboardShell title="Setup">
        <ChatBot />
        <ExportCFG />
        <OverlayURL />
      </DashboardShell>
    </>
  ) : null
}
