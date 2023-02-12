import ExportCFG from '@/components/Dashboard/ExportCFG'
import ChatBot from '@/components/Dashboard/ChatBot'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import { ReactElement, useState } from 'react'
import { Card } from '@/ui/card'
import Link from 'next/link'
import Header from '@/components/Dashboard/Header'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { Button, Steps } from 'antd'

const SetupPage = () => {
  const { status } = useSession()

  const [active, setActive] = useState(0)
  const nextStep = () =>
    setActive((current) => (current < 3 ? current + 1 : current))
  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current))

  const steps = [
    {
      title: 'Twitch chat account',
      content: <ChatBot />,
    },
    {
      title: 'Dota 2 integration',
      content: <ExportCFG />,
    },
    {
      title: 'Stream overlay',
      content: <OBSOverlay />,
    },
    {
      title: 'All done!',
      content: (
        <Card>
          <div className="title command">
            <h3>All done!</h3>
          </div>
          <div className="subtitle">
            Dotabod browser source should be full screen now.
          </div>
          <div>
            <p>
              Test it by joining a bot match. Visit the{' '}
              <Link
                className="text-blue-400 hover:text-blue-300"
                href="overlay"
              >
                Live Preview page
              </Link>{' '}
              to confirm the overlay is showing. You should see the minimap
              blocker overlay, but badge may be missing until you fill out your
              MMR from the{' '}
              <Link
                className="text-blue-400 hover:text-blue-300"
                href="dashboard/features"
              >
                settings page
              </Link>
              .
            </p>
            <div className="flex flex-col items-center space-y-4">
              <Image
                alt="dotabod browser source properties"
                width={284}
                unoptimized
                height={863}
                className="rounded-xl"
                src="/images/setup/play-vs-bots.png"
              />
              <span>Simple minimap</span>
            </div>
          </div>
        </Card>
      ),
    },
  ]

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Setup</title>
      </Head>
      <Header
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
      />

      <Steps current={active} onChange={setActive} items={steps} />

      {steps[active].content}

      {active > 0 && (
        <Button size="large" onClick={prevStep}>
          Back
        </Button>
      )}

      {active === steps.length - 1 && (
        <Link href="/dashboard/features">
          <Button size="large" type="primary">
            View features
          </Button>
        </Link>
      )}
      {active < steps.length - 1 && (
        <Button size="large" type="primary" onClick={nextStep}>
          Next step
        </Button>
      )}
    </>
  ) : null
}

SetupPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default SetupPage
