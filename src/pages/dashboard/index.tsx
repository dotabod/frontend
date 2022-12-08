import ExportCFG from '@/components/Dashboard/ExportCFG'
import ChatBot from '@/components/Dashboard/ChatBot'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import DashboardShell from '@/components/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'

export default function DashboardPage() {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Setup</title>
      </Head>
      <DashboardShell
        subtitle={
          <>
            <div>
              Let&apos;s get Dotabod working for you right away{' '}
              <Image
                src="/images/peepoclap.webp"
                width={30}
                className="inline"
                height={30}
                alt="peepo clap"
              />
            </div>
          </>
        }
        title="Setup"
      >
        <ChatBot />
        <ExportCFG />
        <OBSOverlay />
      </DashboardShell>
    </>
  ) : null
}
