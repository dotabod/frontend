import ChatBot from '@/components/Dashboard/ChatBot'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import ExportCFG from '@/components/Dashboard/ExportCFG'
import Header from '@/components/Dashboard/Header'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import { fetcher } from '@/lib/fetcher'
import { Card } from '@/ui/card'
import { Alert, Button, Steps, Tag } from 'antd'
import confetti from 'canvas-confetti'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect, useState } from 'react'
import useSWR from 'swr'

const SetupPage = () => {
  const { data } = useSWR('/api/settings', fetcher)
  const isLive = data?.stream_online

  const [active, setActive] = useState(0)
  const nextStep = () =>
    setActive((current) => (current < 3 ? current + 1 : current))
  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current))
  const maxStepIndex = 3

  const router = useRouter()
  const { step } = router.query

  useEffect(() => {
    // Assuming the maximum step index is 3 (for a total of 4 steps)
    const parsedStep = Number.parseInt(step as string)

    setActive(
      !Number.isNaN(parsedStep) && parsedStep > 0
        ? Math.min(parsedStep - 1, maxStepIndex)
        : 0
    )
  }, [step]) // Dependency array, re-run effect when `step` changes

  useEffect(() => {
    if (active === maxStepIndex) {
      const end = Date.now() + 1 * 1000
      const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1']

      const frame = () => {
        if (Date.now() > end) return

        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          startVelocity: 60,
          origin: { x: 0, y: 0.5 },
          colors: colors,
        })
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          startVelocity: 60,
          origin: { x: 1, y: 0.5 },
          colors: colors,
        })

        requestAnimationFrame(frame)
      }

      frame()
    }
  }, [active])

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
          {!isLive && (
            <div className="flex flex-row items-center justify-center">
              <Alert
                message="Your stream is offline, and Dotabod will only work once you start streaming and go online."
                type="warning"
                showIcon
                className="max-w-2xl"
              />
            </div>
          )}
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
          <div>
            <p>
              Test it by watching a live match. Type <Tag>!np</Tag> while
              spectating and you should see Dotabod respond in your Twitch chat.
              Visit the <Link href="overlay">Live Preview page</Link> to confirm
              the overlay is showing. You should see the minimap blocker overlay
              once you&apos;re in a match.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center space-x-4">
            <div>
              <Image
                alt="watch live match"
                width={1320}
                height={3161}
                className="rounded-xl"
                src="https://i.imgur.com/dwa1ie0.png"
              />
            </div>
          </div>
        </Card>
      ),
    },
  ]

  return (
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
                unoptimized
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
  )
}

SetupPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default SetupPage
