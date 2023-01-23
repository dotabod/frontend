import ExportCFG from '@/components/Dashboard/ExportCFG'
import ChatBot from '@/components/Dashboard/ChatBot'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import { accordionStyles } from '@/components/accordionStyles'
import { Accordion } from '@mantine/core'
import FullStorySession from '@/components/FullStorySession'

export default function DashboardPage() {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <FullStorySession />

      <Head>
        <title>Dotabod | Setup</title>
      </Head>
      <DashboardShell
        subtitle={
          <>
            <div>
              Let&apos;s get Dotabod working for you right away{' '}
              <Image
                src="/images/emotes/peepoclap.webp"
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
        <Accordion
          variant="separated"
          defaultValue="chatbot"
          styles={accordionStyles}
        >
          <div className="grid grid-cols-1 gap-6">
            <ChatBot />
            <ExportCFG />
            <OBSOverlay />
          </div>
        </Accordion>
      </DashboardShell>
    </>
  ) : null
}
