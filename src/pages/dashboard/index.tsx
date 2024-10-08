import ChatBot from '@/components/Dashboard/ChatBot'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import ExportCFG from '@/components/Dashboard/ExportCFG'
import Header from '@/components/Dashboard/Header'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import { fetcher } from '@/lib/fetcher'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import { Alert, Button, Collapse, Steps } from 'antd'
import confetti from 'canvas-confetti'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect, useState } from 'react'
import useSWR from 'swr'
import { useTranslation } from 'next-i18next'

const SetupPage = () => {
  const { t } = useTranslation('common')
  const track = useTrack()
  const { data } = useSWR('/api/settings', fetcher)
  const isLive = data?.stream_online

  const [active, setActive] = useState(0)
  const router = useRouter()

  const updateStepInUrl = (newActiveStep) => {
    // Update the URL without adding a new history entry
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, step: newActiveStep + 1 }, // +1 to make it 1-indexed for the URL
      },
      undefined,
      { shallow: true }
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
      !Number.isNaN(parsedStep) && parsedStep > 0
        ? Math.min(parsedStep - 1, maxStepIndex)
        : 0
    )
  }, [router.query.step]) // Dependency array, re-run effect when `step` changes

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
      title: t('dashboard.setup.twitch'),
      content: <ChatBot />,
    },
    {
      title: t('dashboard.setup.dota2'),
      content: <ExportCFG />,
    },
    {
      title: t('dashboard.setup.obs'),
      content: <OBSOverlay />,
    },
    {
      title: t('dashboard.setup.allDone'),
      content: (
        <Card>
          {!isLive && (
            <div className="flex flex-row items-center justify-center">
              <Alert
                message={t('dashboard.setup.streamOfflineWarning')}
                type="warning"
                showIcon
                className="max-w-2xl"
              />
            </div>
          )}
          <div className="mb-4 space-x-2">
            <span>
              <b>{t('dashboard.setup.thatsIt')}</b>
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
            <p>{t('dashboard.setup.hopIntoMatch')}</p>
            <Collapse
              onChange={() => {
                track('setup/collapse_test_dotabod')
              }}
              accordion
              items={[
                {
                  label: t('dashboard.setup.howToTest'),
                  children: (
                    <>
                      <ol className="list-decimal list-inside">
                        <li>{t('dashboard.setup.demoHeroStep')}</li>
                        <li>
                          {t('dashboard.setup.livePreviewStep')}{' '}
                          <Link href="/overlay">{t('dashboard.setup.livePreviewPage')}</Link>
                        </li>
                        <li>
                          {t('dashboard.setup.troubleshootingStep')}{' '}
                          <Link href="/dashboard/troubleshoot">{t('dashboard.setup.troubleshootingPage')}</Link>
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
        <title>Dotabod | {t('dashboard.setup.title')}</title>
      </Head>
      <Header
        subtitle={
          <>
            <div>
              {t('dashboard.setup.subtitle')}{' '}
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
        title={t('dashboard.setup.title')}
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

      {steps[active].content}

      <div className="flex space-x-4 pb-10">
        {active > 0 && (
          <Button size="large" onClick={prevStep}>
            {t('dashboard.setup.back')}
          </Button>
        )}

        {active === steps.length - 1 && (
          <Link href="/dashboard/features">
            <Button size="large" type="primary">
              {t('dashboard.setup.viewFeatures')}
            </Button>
          </Link>
        )}
        {active < steps.length - 1 && (
          <Button size="large" type="primary" onClick={nextStep}>
            {t('dashboard.setup.nextStep')}
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
