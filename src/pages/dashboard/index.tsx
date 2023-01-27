import ExportCFG from '@/components/Dashboard/ExportCFG'
import ChatBot from '@/components/Dashboard/ChatBot'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import { Button, Group, Stepper } from '@mantine/core'
import { useState } from 'react'
import { Card } from '@/ui/card'
import Link from 'next/link'
import { Display } from '@geist-ui/core'

export default function DashboardPage() {
  const { status } = useSession()

  const [active, setActive] = useState(0)
  const nextStep = () =>
    setActive((current) => (current < 3 ? current + 1 : current))
  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current))

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
        <>
          <Stepper
            styles={{
              stepIcon: {
                borderColor: 'var(--mantine-color-dark-5)',
                '&[data-progress]': {
                  borderColor: 'var(--mantine-color-blue-6)',
                },
                '&[data-completed]': {
                  backgroundColor: 'var(--mantine-color-blue-6)',
                },
              },
            }}
            active={active}
            onStepClick={setActive}
            breakpoint="sm"
          >
            <Stepper.Step
              translate="no"
              label="First step"
              description="Twitch chat account"
            >
              <ChatBot />
            </Stepper.Step>
            <Stepper.Step
              translate="no"
              label="Second step"
              description="Dota 2 integration"
            >
              <ExportCFG />
            </Stepper.Step>
            <Stepper.Step
              translate="no"
              label="Final step"
              description="Stream overlay"
            >
              <OBSOverlay />
            </Stepper.Step>
            <Stepper.Completed>
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
                    to confirm the overlay is showing. You should see the
                    minimap blocker overlay, but badge may be missing until you
                    fill out your MMR from the{' '}
                    <Link
                      className="text-blue-400 hover:text-blue-300"
                      href="dashboard/features"
                    >
                      settings page
                    </Link>
                    .
                  </p>
                  <Display shadow>
                    <Image
                      alt="dotabod browser source properties"
                      width={284}
                      unoptimized
                      height={863}
                      src="/images/setup/play-vs-bots.png"
                    />
                  </Display>
                </div>
              </Card>
            </Stepper.Completed>
          </Stepper>

          <Group position="center" mt="xl">
            <Button size="lg" variant="default" onClick={prevStep}>
              Back
            </Button>

            {active === 3 && (
              <Link href="/dashboard/features">
                <Button color="green" className="bg-green-600" size="lg">
                  View features
                </Button>
              </Link>
            )}
            {active !== 3 && (
              <Button className="bg-blue-600" size="lg" onClick={nextStep}>
                Next step
              </Button>
            )}
          </Group>
        </>
      </DashboardShell>
    </>
  ) : null
}
