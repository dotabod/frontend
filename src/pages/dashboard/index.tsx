'use client'

import confetti from 'canvas-confetti'
import { ChevronLeft } from 'lucide-react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

import ChatBot from '@/components/Dashboard/ChatBot'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import ExportCFG from '@/components/Dashboard/ExportCFG'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Stepper } from '@/components/ui/stepper'
import { fetcher } from '@/lib/fetcher'
import { CaretSortIcon } from '@radix-ui/react-icons'

const SetupPage = () => {
  const { data } = useSWR('/api/settings', fetcher)
  const isLive = data?.stream_online

  const [active, setActive] = useState(0)
  const router = useRouter()

  const updateStepInUrl = (newActiveStep) => {
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, step: newActiveStep + 1 },
      },
      undefined,
      { shallow: true }
    )
  }

  const nextStep = () =>
    setActive((current) => {
      const nextStep = current < 3 ? current + 1 : current
      updateStepInUrl(nextStep)
      return nextStep
    })

  const prevStep = () =>
    setActive((current) => {
      const prevStep = current > 0 ? current - 1 : current
      updateStepInUrl(prevStep)
      return prevStep
    })

  const maxStepIndex = 3

  useEffect(() => {
    const parsedStep = Number.parseInt(router.query.step as string)
    setActive(
      !Number.isNaN(parsedStep) && parsedStep > 0
        ? Math.min(parsedStep - 1, maxStepIndex)
        : 0
    )
  }, [router.query.step])

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
        <>
          {!isLive && (
            <div className="flex flex-row items-center justify-center">
              <Alert>
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Your stream is offline, and Dotabod will only work once you
                  start streaming and go online.
                </AlertDescription>
              </Alert>
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
              You can either hop into a match right away, or you can test
              Dotabod first.
            </p>
            <Collapsible>
              <div className="flex items-center justify-between space-x-4">
                <CollapsibleTrigger asChild>
                  <Button size="sm">
                    How to test Dotabod
                    <CaretSortIcon className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <ol className="list-decimal list-inside">
                  <li>
                    Demo any hero to get Dotabod to recognize your Steam
                    account.
                  </li>
                  <li>
                    While demoing, visit the{' '}
                    <Link href="/overlay">Live Preview page</Link> to confirm
                    the overlay is showing.
                  </li>
                  <li>
                    Having trouble? Visit the{' '}
                    <Link href="/dashboard/troubleshoot">
                      Troubleshooting page
                    </Link>{' '}
                    to get help.
                  </li>
                </ol>
                <div className="flex flex-col items-center justify-center space-x-4">
                  <Image
                    alt="crystal maiden demo hero"
                    width={2384}
                    height={1506}
                    className="rounded-xl"
                    src="https://i.imgur.com/nJrBvdf.png"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </>
      ),
    },
  ]

  return (
    <>
      <Head>
        <title>Dotabod | Setup</title>
      </Head>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7">
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Setup
        </h1>
        <div className="ml-auto sm:ml-0">
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
      </div>
      <div className="grid gap-4 lg:gap-8">
        <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
          <Card>
            <CardHeader>
              <CardDescription>
                <Stepper
                  steps={steps}
                  currentStep={active}
                  onChange={(newActiveStep) => {
                    setActive(newActiveStep)
                    updateStepInUrl(newActiveStep)
                  }}
                />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 pb-10">
                {active > 0 && <Button onClick={prevStep}>Back</Button>}

                {active === steps.length - 1 && (
                  <Link href="/dashboard/features">
                    <Button>View features</Button>
                  </Link>
                )}
                {active < steps.length - 1 && (
                  <Button onClick={nextStep}>Next step</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

SetupPage.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default SetupPage
