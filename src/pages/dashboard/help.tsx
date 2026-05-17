import { MessageOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  message,
  type StepProps,
  Steps,
  type StepsProps,
  Tag,
} from 'antd'
import axios from 'axios'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import type React from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import {
  PowerShellFailureMessage,
  PowerShellSetupStep,
  PowerShellTroubleshootingContent,
} from '@/components/Dashboard/PowerShellTroubleshooting'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import { STEAM_CONNECTION_MESSAGES } from '@/lib/steamConnectionMessages'
import { Card } from '@/ui/card'

// Define form values interface
interface FormValues {
  email: string
  message: string
  subject: string
}

export const StepComponent: React.FC<{
  steps: ReactNode[]
  initialStep?: number
  status?: StepsProps['status']
  hideTitle?: boolean
  stepProps?: StepProps[]
}> = ({ steps, initialStep = 0, status, hideTitle, stepProps }) => {
  const [current, setCurrent] = useState(initialStep)

  const onChange = (value: number) => {
    setCurrent(value)
  }

  return (
    <Steps
      status={status}
      size='small'
      current={current}
      onChange={onChange}
      direction='vertical'
      items={steps.map((step, index) => ({
        title: hideTitle ? undefined : `Step ${index + 1}`,
        description: step,
        ...stepProps?.[index],
      }))}
    />
  )
}

const faqs = [
  {
    question: 'How do I connect my Steam account?',
    answer: (
      <div>
        <Alert
          type='warning'
          showIcon
          className='mb-3'
          message='Your stream must be live for Steam to connect'
          description="Steam only connects while you're streaming on Twitch."
        />

        <Alert
          type='info'
          showIcon
          className='mb-3'
          message='Steam connects automatically the next time you play.'
        />

        <StepComponent
          steps={[
            <span key={0}>
              <strong>Start streaming on Twitch</strong>
              <div className='mt-1 text-sm'>
                Make sure your stream is live before connecting Steam.
              </div>
            </span>,
            <span key={1}>
              <strong>Play any Dota 2 match or demo a hero</strong>
              <div className='mt-1 text-sm'>
                While you're live, Dotabod detects your Steam account automatically. Type{' '}
                <Tag>!facet</Tag> in chat to confirm Dotabod can find you.
              </div>
            </span>,
            <span key={2}>
              <strong>Confirm Steam appears in your MMR tracker</strong>
              <div className='mt-1 text-sm'>
                Open the <Link href='/dashboard/features'>Features page</Link>. Your Steam account
                should appear there with your avatar and MMR.
              </div>
            </span>,
            <span key={3}>
              <strong>All set</strong>
              <div className='mt-1 text-sm'>{STEAM_CONNECTION_MESSAGES.autoConnectOffline}</div>
            </span>,
          ]}
        />

        <Alert
          type='error'
          showIcon
          className='mt-4'
          message='Played while streaming, but your account still isn’t showing?'
          description={<PowerShellTroubleshootingContent />}
        />
      </div>
    ),
  },
  {
    question: 'How do I test that it works?',
    answer: (
      <StepComponent
        steps={[
          <span key={1}>
            Type <Tag>!ping</Tag> in your Twitch chat to make sure dotabod can type.
          </span>,
          <span key={2}>
            Spectate a live pro match and type <Tag>!np</Tag> to confirm Dotabod responds with the
            notable players.
          </span>,
        ]}
      />
    ),
  },
  {
    question: "Overlay stuck, won't update?",
    answer: (
      <StepComponent
        steps={[
          <span key={0}>In OBS, click Refresh on the Dotabod browser source.</span>,
          'Restart OBS.',
          'Confirm your stream is live.',
          'Try the steps under "Overlay not showing anything?"',
        ]}
      />
    ),
  },
  {
    question: 'Overlay not showing anything?',
    answer: (
      <StepComponent
        steps={[
          'Remove the Dotabod browser source in OBS, then add it again.',
          'In OBS, right-click the Dotabod browser source, then choose Transform, then Fit to content.',
          <span key={3}>
            Check your OBS version. OBS 31 and later can show blank overlays due to a Chromium
            change. If that's you:
            <div className='mt-2'>
              <a
                href='https://github.com/obsproject/obs-studio/releases/download/30.2.3/OBS-Studio-30.2.3-Windows-Installer.exe'
                target='_blank'
                rel='noreferrer'
                className='text-blue-500 hover:underline'
              >
                Download OBS 30.2.3
              </a>{' '}
              and run the installer. You don't need to uninstall first.
            </div>
          </span>,
          <span key={4}>
            Check the cfg file location. It belongs in <Tag>/gamestate_integration/</Tag>, not{' '}
            <Tag>/cfg/</Tag>.
          </span>,
          'Restart the Dota client and Steam.',
          <span key={5}>
            <strong>Regional blocking note</strong>
            <div className='mt-1 text-sm'>
              Some ISPs and networks block Cloudflare, which can hide the overlay. If that's you,
              try the community tool{' '}
              <a
                href='https://github.com/Flowseal/zapret-discord-youtube'
                target='_blank'
                rel='noreferrer'
                className='text-blue-500 hover:underline'
              >
                zapret-discord-youtube
              </a>
              . Add <Tag>dotabod.com</Tag> and <Tag>gsi.dotabod.com</Tag> to{' '}
              <code>lists/list-general.txt</code> on separate lines. If that doesn't help, some
              users have had success with{' '}
              <a
                href='https://github.com/Flowseal/zapret-discord-youtube/releases/tag/1.9.0b'
                target='_blank'
                rel='noreferrer'
                className='text-blue-500 hover:underline'
              >
                v1.9.0b
              </a>
              .
            </div>
          </span>,
          "In OBS, move the Dotabod browser source above your other sources so they don't cover it.",
        ]}
      />
    ),
  },
  {
    question: "Dotabod won't talk in chat?",
    answer: (
      <StepComponent
        steps={[
          <span key={0}>
            Type <Tag>/unban dotabod</Tag> in your chat.
          </span>,
          'Toggle Dotabod off and on using the switch at the top left of the dashboard. This forces Dotabod to rejoin your channel.',
          <span key={2}>
            Type <Tag>!ping</Tag> in chat to confirm Dotabod can talk.
          </span>,
        ]}
      />
    ),
  },
  {
    question: "Dotabod can't find my Steam ID after I played?",
    answer: (
      <div>
        <Alert
          type='warning'
          showIcon
          className='mb-3'
          message='First, confirm your stream was live when you played'
          description='Steam only connects while your Twitch stream is live. If you were offline, start streaming and play again.'
        />
        <StepComponent
          steps={[
            <PowerShellSetupStep key={0} />,
            <span key={1}>
              <strong>Check the cfg file location</strong>
              <div className='mt-1 text-sm'>
                The cfg file may be in the wrong folder.{' '}
                <Link href='/dashboard?step=2'>Follow Step 2</Link> again. It belongs in{' '}
                <Tag>/gamestate_integration/</Tag>, not <Tag>/cfg/</Tag>. Restart Dota after moving
                the file.
              </div>
            </span>,
            <span key={2}>
              <strong>Check for an account conflict</strong>
              <div className='mt-1 text-sm'>
                Your Steam account may be linked to another Dotabod user. Only one user can link a
                Steam account at a time. Open{' '}
                <Link href='/dashboard/features'>the MMR tracker on the Features page</Link> to see
                who's currently using it. Ask them to remove the link, or{' '}
                <Link href='/dashboard/help'>contact support</Link> for help unlinking.
              </div>
            </span>,
            <span key={3}>
              <strong>Still not working?</strong>
              <div className='mt-1 text-sm'>
                <PowerShellFailureMessage />
              </div>
            </span>,
          ]}
        />
      </div>
    ),
  },
  {
    question: 'Why does my stream need to be live to connect Steam?',
    answer: (
      <div>
        <p className='mb-3'>
          Dotabod is a streaming tool, so it activates only when you're live on Twitch. That
          includes detecting and connecting your Steam account.
        </p>
        <Alert
          type='info'
          showIcon
          message='You only need to be streaming for the first connection.'
          description="After Steam connects once while you're streaming, every future match works automatically, even offline or with a different Steam account."
        />
        <p className='mt-3'>
          <strong>Typical flow:</strong>
        </p>
        <ol className='mt-2 list-inside list-decimal space-y-1'>
          <li>Run the PowerShell script (can be done offline).</li>
          <li>Start streaming on Twitch.</li>
          <li>Play a match or demo a hero.</li>
          <li>Steam connects and appears in your MMR tracker.</li>
          <li>Future matches auto-connect, regardless of stream status.</li>
        </ol>
      </div>
    ),
  },
  {
    question: 'MMR not tracking?',
    answer: (
      <span>
        <Link href='/dashboard/features'>Enter your current MMR</Link> on the Features page so we
        have a starting value.
      </span>
    ),
  },
  {
    question: "Why do bets open right when I pick? Can't I get counter-picked?",
    answer:
      "Bets open once your pick is visible to the enemy team in-game. By then, they can't counter-pick or counter-ban your hero anyway.",
  },
  {
    question: 'Can I still use 9kmmrbot?',
    answer: (
      <div className='flex flex-col space-y-4'>
        <div>
          Running Dotabod and 9kmmrbot together works fine. Your chat might not love the double-bot
          spam, though.
        </div>
        <div>
          One thing to note: 9kmmrbot can no longer pull game data for accounts outside the high
          immortal bracket (roughly the top 1000 players). Dotabod&apos;s integration works at every
          rank.
        </div>
      </div>
    ),
  },
  {
    question: 'Chrome says "Local network access denied", or the installer or OBS won\'t connect?',
    answer: (
      <StepComponent
        steps={[
          <span key={0}>
            Chrome 142 and later asks for permission before connecting to your local network. When
            Chrome prompts you to &quot;Look for and connect to any device on your local
            network&quot;, click &quot;Allow&quot;.
          </span>,
          <span key={1}>
            Already denied the prompt? Re-enable it:
            <ol className='list-decimal list-inside mt-2 space-y-1'>
              <li>Click the lock icon (or site icon) in Chrome&apos;s address bar.</li>
              <li>Open &quot;Site settings&quot;.</li>
              <li>Find &quot;Look for and connect to devices on your local network&quot;.</li>
              <li>Set it to &quot;Allow&quot;.</li>
              <li>Refresh the Dotabod page.</li>
            </ol>
          </span>,
          <span key={2}>
            This permission lets Dotabod talk to:
            <ul className='list-disc list-inside mt-2 space-y-1'>
              <li>The Windows installer service running on your computer.</li>
              <li>Your local OBS WebSocket server during OBS setup.</li>
            </ul>
          </span>,
        ]}
      />
    ),
  },
]

const TroubleshootPage = () => {
  const session = useSession()
  const { data } = useSWR('/api/settings', fetcher, SETTINGS_SWR_OPTIONS)
  const isLive = data?.stream_online
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [hubspotBlocked, setHubspotBlocked] = useState(false)

  // Check if HubSpot is blocked
  useEffect(() => {
    let checkAttempts = 0
    const maxAttempts = 5 // 2.5 seconds with 500ms interval
    let checkInterval: NodeJS.Timeout | null = null

    const checkHubspotAvailability = () => {
      // Check if HubSpot script loaded properly
      const hubspotLoaded = typeof window.HubSpotConversations !== 'undefined'

      if (hubspotLoaded) {
        // HubSpot is available, clear interval
        if (checkInterval) {
          clearInterval(checkInterval)
        }
        setHubspotBlocked(false)
      } else if (checkAttempts >= maxAttempts) {
        // Max attempts reached, consider HubSpot blocked
        if (checkInterval) {
          clearInterval(checkInterval)
        }
        setHubspotBlocked(true)
      }

      checkAttempts++
    }

    if (typeof window !== 'undefined') {
      // Initial check
      checkHubspotAvailability()

      // Set up interval to check every 500ms for up to 5 seconds
      checkInterval = setInterval(checkHubspotAvailability, 500)

      // Clean up interval on unmount
      return () => {
        if (checkInterval) {
          clearInterval(checkInterval)
        }
      }
    }
  }, [])

  // Function to open HubSpot chat widget
  const openChatWidget = () => {
    if (window.HubSpotConversations) {
      window.HubSpotConversations.widget.open()
    } else {
      message.error('Live chat is blocked by your browser or an extension.')
    }
  }

  // Function to handle form submission to HubSpot
  const handleSubmit = async (values: FormValues) => {
    if (!values.message) {
      message.error('Add a message before sending.')
      return
    }

    setSubmitting(true)
    try {
      // HubSpot API endpoint for form submissions
      const hubspotEndpoint =
        'https://api.hsforms.com/submissions/v3/integration/submit/39771134/a394f067-5026-42bd-8e2d-c556ffd6499f'

      // Prepare the data for HubSpot
      const data = {
        fields: [
          {
            name: 'email',
            value: session.data?.user?.email || session.data?.user?.name,
          },
          {
            name: 'TICKET.subject',
            value: 'Troubleshooting',
          },
          {
            name: 'TICKET.content',
            value: values.message || '',
          },
        ],
        context: {
          pageUri: window.location.href,
          pageName: 'Dotabod Troubleshooting',
        },
      }

      // Submit to HubSpot
      await axios.post(hubspotEndpoint, data)

      // Show success message
      message.success("Message sent. We'll reply within one business day.")
      form.resetFields(['message'])
    } catch (error) {
      console.error('Error submitting form:', error)
      message.error("Couldn't send your message. Try again, or use live chat.")

      // Check if it might be due to content blockers
      if (
        (error as Error).message?.includes('Network Error') ||
        (error as Error).message?.includes('Failed to fetch')
      ) {
        message.warning('Ad blockers or privacy extensions may be blocking the request.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Dotabod | Troubleshooting</title>
      </Head>
      <Header
        subtitle='Common fixes for setup, overlay, Steam, and chat issues. Still stuck? Send us a message below.'
        title='Troubleshooting'
      />
      <div className='flex flex-col gap-4 justify-between items-start'>
        <div className='max-w-2xl w-full'>
          <Card className='gap-4 flex flex-col' title='Still stuck? Send us a message'>
            {hubspotBlocked && (
              <Alert
                banner
                message="Live chat couldn't load. Your browser's privacy settings or an extension may be blocking it."
                type='warning'
                showIcon
              />
            )}

            <Form
              form={form}
              layout='vertical'
              onFinish={handleSubmit}
              className='gap-4 flex flex-col'
            >
              <Form.Item
                name='message'
                label='Message'
                rules={[
                  {
                    required: true,
                    message: 'Add a message so we can help.',
                  },
                  {
                    min: 80,
                    message: 'Add a bit more detail. We need at least 80 characters to help.',
                  },
                ]}
              >
                <Input.TextArea
                  placeholder='What went wrong? Include what you tried and what happened.'
                  rows={4}
                />
              </Form.Item>

              <Form.Item>
                <div className='flex flex-wrap gap-3 items-center'>
                  <Button type='primary' htmlType='submit' loading={submitting}>
                    Send message
                  </Button>
                  <Divider type='vertical' />
                  <Button icon={<MessageOutlined />} onClick={openChatWidget} type='default'>
                    Open live chat
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Card>
        </div>
        {!isLive && (
          <Alert
            message="Your stream is offline. Some features (like first-time Steam detection) only run while you're live."
            type='warning'
            showIcon
            className='grow'
          />
        )}
      </div>

      <div className='lg:col-span-2'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
          {faqs.map(
            (faq) =>
              faq.question && (
                <Card key={faq.question}>
                  <dt className='text-lg font-medium leading-6'>{faq.question}</dt>
                  <dd className='mt-2 text-base text-gray-300'>{faq.answer}</dd>
                </Card>
              ),
          )}
        </div>
      </div>
    </>
  )
}

TroubleshootPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Troubleshoot | Dotabod Dashboard',
        description: 'Troubleshoot and resolve issues with your Dotabod setup.',
        canonicalUrl: 'https://dotabod.com/dashboard/help',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess()

export default TroubleshootPage
