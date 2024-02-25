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
      title: 'Twitch',
      content: <ChatBot />,
    },
    {
      title: 'Dota 2',
      content: <ExportCFG />,
    },
    {
      title: 'OBS',
      content: <OBSOverlay />,
    },
    {
      title: 'All done!',
      content: (
        <Card>
          <div className="mb-4 space-x-2">
            <span>
              <b>That&apos;s it!</b> You&apos;re all set up.
            </span>
            <Image
              className="inline"
              alt="ok emote"
              unoptimized
              src="https://cdn.7tv.app/emote/61767e69ffc7244d797d22f4/1x.webp"
              width={28}
              height={28}
            />
          </div>
          <div className="flex flex-row space-x-4">
            <div className="flex-none">
              <Image
                alt="dotabod browser source properties"
                width={284}
                unoptimized
                height={863}
                className="rounded-xl"
                src="/images/setup/play-vs-bots.png"
              />
            </div>
            <div>
              <p>
                Test it by joining a bot match. Visit the{' '}
                <Link href="overlay">Live Preview page</Link> to confirm the
                overlay is showing. You should see the minimap blocker overlay
                once you&apos;re in a match.
              </p>
              <p>Note: Dotabod will only work if your stream is online.</p>
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

      <div className="flex space-x-4 pb-10">
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
      </div>
    </>
  ) : null
}

SetupPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default SetupPage
