import ChatBot from '@/components/Dashboard/ChatBot'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import ExportCFG from '@/components/Dashboard/ExportCFG'
import Header from '@/components/Dashboard/Header'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import { fetcher } from '@/lib/fetcher'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import { GRACE_PERIOD_END, isInGracePeriod } from '@/utils/subscription'
import { Alert, App, Button, Collapse, Space, Steps } from 'antd'
import confetti from 'canvas-confetti'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect, useState } from 'react'
import useSWR from 'swr'

const SetupPage = () => {
  const session = useSession()
  const { notification } = App.useApp()
  const track = useTrack()
  const { data } = useSWR('/api/settings', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
  const isLive = data?.stream_online

  const [active, setActive] = useState(0)
  const router = useRouter()
  const didJustPay = router.query.paid === 'true'
  const isTrial = router.query.trial === 'true'

  const updateStepInUrl = (newActiveStep) => {
    // Update the URL without adding a new history entry
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, step: newActiveStep + 1 }, // +1 to make it 1-indexed for the URL
      },
      undefined,
      { shallow: true },
    ) // `shallow: true` to not trigger data fetching methods again
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
      !Number.isNaN(parsedStep) && parsedStep > 0 ? Math.min(parsedStep - 1, maxStepIndex) : 0,
    )
  }, [router.query.step]) // Dependency array, re-run effect when `step` changes

  const trialDays = isInGracePeriod()
    ? Math.ceil((GRACE_PERIOD_END.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 14

  useEffect(() => {
    if (active === maxStepIndex || didJustPay) {
      const end = Date.now() + 1 * 1000
      const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1']

      if (didJustPay) {
        notification.success({
          key: 'paid',
          message: isTrial ? 'Dotabod Pro Unlocked' : 'Dotabod Pro Unlocked',
          description: isTrial
            ? `Your ${trialDays}-day trial with full access to all features begins now.`
            : 'Thanks for supporting Dotabod! All premium features are now unlocked.',
          duration: 55,
        })
        // Clear the query params
        router.replace({
          pathname: router.pathname,
          query: { ...router.query, paid: undefined },
        })
      }

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
  }, [active, didJustPay, isTrial, router.pathname, router.query, router.replace])

  if (session?.data?.user?.isImpersonating) {
    return null
  }

  const steps = [
    {
      title: 'Stream',
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
            <div className='flex flex-row items-center justify-center'>
              <Alert
                message='Your stream is offline, and Dotabod will only work once you start streaming and go online.'
                type='warning'
                showIcon
                className='max-w-2xl'
              />
            </div>
          )}
          <div className='mb-4 space-x-2'>
            <span>
              <b>That&apos;s it!</b> You&apos;re all set up.
            </span>
            <Image
              className='inline'
              alt='ok emote'
              unoptimized
              src='https://cdn.7tv.app/emote/61767e69ffc7244d797d22f4/1x.webp'
              width={28}
              height={28}
            />
          </div>
          <div>
            <p>You can either hop into a match right away, or you can test Dotabod first.</p>
            <Collapse
              onChange={() => {
                track('setup/collapse_test_dotabod')
              }}
              accordion
              items={[
                {
                  label: 'How to test Dotabod',
                  children: (
                    <>
                      <ol className='list-decimal list-inside'>
                        <li>Demo any hero to get Dotabod to recognize your Steam account.</li>
                        <li>
                          While demoing, visit the <Link href='/overlay'>Live Preview page</Link> to
                          confirm the overlay is showing.
                        </li>
                        <li>
                          Having trouble? Visit the{' '}
                          <Link href='/dashboard/troubleshoot'>Troubleshooting page</Link> to get
                          help.
                        </li>
                      </ol>
                      <div className='flex flex-col items-center justify-center space-x-4'>
                        <Image
                          alt='crystal maiden demo hero'
                          width={2384}
                          height={1506}
                          className='rounded-xl'
                          src='https://i.imgur.com/nJrBvdf.png'
                        />
                      </div>
                    </>
                  ),
                },
              ]}
            />
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
          <div>
            Let&apos;s get Dotabod working for you right away{' '}
            <Image
              src='/images/emotes/peepoclap.webp'
              width={30}
              unoptimized
              className='inline'
              height={30}
              alt='peepo clap'
            />
          </div>
        }
        title='Setup'
      />

      <Steps
        current={active}
        onChange={(newActiveStep) => {
          setActive(newActiveStep)
          updateStepInUrl(newActiveStep)
          track('setup/change_step', { step: newActiveStep })
        }}
        items={steps}
      />

      <div className='mb-10' />

      {steps[active].content}

      <Space>
        {active > 0 && (
          <Button size='large' onClick={prevStep}>
            Back
          </Button>
        )}

        {active === steps.length - 1 && (
          <Link href='/dashboard/features'>
            <Button size='large' type='primary'>
              View features
            </Button>
          </Link>
        )}
        {active < steps.length - 1 && (
          <Button size='large' type='primary' onClick={nextStep}>
            Next step
          </Button>
        )}
      </Space>
    </>
  )
}

SetupPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Dashboard | Dotabod',
        description:
          'Manage your Dotabod settings and features to enhance your Dota 2 streaming experience.',
        canonicalUrl: 'https://dotabod.com/dashboard',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export default SetupPage
