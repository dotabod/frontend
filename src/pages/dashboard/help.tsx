import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { fetcher } from '@/lib/fetcher'
import { Card } from '@/ui/card'
import { MessageOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  type StepProps,
  Steps,
  type StepsProps,
  Tag,
  message,
} from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import type React from 'react'
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

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
    question: 'How to connect my steam account?',
    answer: (
      <StepComponent
        steps={[
          <span key={0}>
            Demo any hero and type <Tag>!facet</Tag> in your chat to confirm Dotabod can find you.
          </span>,
          <span key={1}>
            While demoing, visit the <Link href='/overlay'>Live Preview page</Link> to confirm the
            overlay is showing.
          </span>,
        ]}
      />
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
          <span key={0}>Press refresh on the dotabod overlay source in OBS</span>,
          'Restart OBS.',
          'Confirm your stream is online.',
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
          'Try removing and re-adding your overlay.',
          'In OBS, right click the dotabod browser source, click "Transform", and click "Fit to content" so it resizes and fills your screen.',
          <span key={3}>
            Check your OBS version. If you're using OBS v31 or above, you may experience blank
            overlays due to Chromium changes.
            <div className='mt-2'>
              <a
                href='https://github.com/obsproject/obs-studio/releases/download/30.2.3/OBS-Studio-30.2.3-Windows-Installer.exe'
                target='_blank'
                rel='noreferrer'
                className='text-blue-500 hover:underline'
              >
                Download OBS 30.2.3
              </a>{' '}
              and run the installer to downgrade - no need to uninstall first.
            </div>
          </span>,
          <span key={4}>
            Check that you placed the cfg file in the correct folder. It goes in{' '}
            <Tag>/gamestate_integration/</Tag> not in <Tag>/cfg/</Tag>
          </span>,
          'Restart the Dota client and Steam.',
          "The Dotabod browser source in OBS might have to be moved up above your other sources so it doesn't get blocked.",
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
            Type <Tag>/unban dotabod</Tag> in your chat
          </span>,
          'Try enabling and disabling Dotabod using the toggle in the top left of Dotabod dashboard. This will force Dotabod to rejoin your channel.',
          <span key={2}>
            Type <Tag>!ping</Tag> in chat to see if Dotabod can talk
          </span>,
        ]}
      />
    ),
  },
  {
    question: 'Dotabod keeps saying play a match, no steam id?',
    answer: (
      <StepComponent
        steps={[
          <span key={0}>
            You probably placed the cfg file in the wrong folder.{' '}
            <Link href='/dashboard?step=2'>Follow Step 2</Link> of setup again. Don't forget to
            reboot Dota after saving the cfg in the right folder.
          </span>,
          <span key={2}>
            Still nothing? Could your Steam account be linked to another Dotabod user? Only one
            person may have the Steam account linked. Dotabod will tell you who is using your
            account from{' '}
            <Link href='/dashboard/features'>the MMR tracker in the Features page</Link>. You can
            then ask them to remove it from their account. Or, visit our{' '}
            <Link href='/dashboard/help'>help page</Link> for assistance with unlinking your Steam
            account.
          </span>,
        ]}
      />
    ),
  },
  {
    question: 'MMR not tracking?',
    answer: (
      <span>
        <Link href='/dashboard/features'>Enter your current MMR</Link> in the dashboard so that it
        isnt 0.
      </span>
    ),
  },
  {
    question: "Why do bets open right when I pick? Can't I get counter picked?",
    answer:
      'Bets open when its no longer possible to counter pick or counter ban your hero. That is to say, when the enemy can now see who you picked in-game.',
  },
  {
    question: 'Can I still use 9kmmrbot?',
    answer: (
      <div className='flex flex-col space-y-4'>
        <div>
          Using Dotabod and 9kmmrbot together will not cause any issues. But your chat might not
          like the double bot spam.
        </div>
        <div>
          Furthermore, 9kmmrbot is no longer able to retrieve game data for accounts outside of the
          high immortal bracket (typically, the top 1000 players). Dotabod&apos;s game integration
          works for all players, regardless of rank.
        </div>
      </div>
    ),
  },
]

const TroubleshootPage = () => {
  const session = useSession()
  const { data } = useSWR('/api/settings', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
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
      message.error('Chat support appears to be blocked by your browser or extensions')
    }
  }

  // Function to handle form submission to HubSpot
  const handleSubmit = async (values: FormValues) => {
    if (!values.message) {
      message.error('Please enter a message')
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
      message.success('Your message has been sent! We will get back to you soon.')
      form.resetFields(['message'])
    } catch (error) {
      console.error('Error submitting form:', error)
      message.error('There was an error submitting your message. Please try again.')

      // Check if it might be due to content blockers
      if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
        message.warning('This may be due to ad blockers or privacy settings in your browser')
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
      <Header subtitle="Try these steps in case something isn't working." title='Troubleshooting' />
      <div className='flex flex-col gap-4 justify-between items-start'>
        <div className='max-w-2xl w-full'>
          <Card className='gap-4 flex flex-col' title='Need help? Get support'>
            {hubspotBlocked && (
              <Alert
                banner
                message="Live chat may be blocked by your browser's privacy settings or extensions"
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
                    message: 'Please enter your message - we need details to help you effectively',
                  },
                  {
                    min: 80,
                    message:
                      'Please provide more details about your issue (at least 80 characters)',
                  },
                ]}
              >
                <Input.TextArea placeholder="Describe the issue you're experiencing..." rows={4} />
              </Form.Item>

              <Form.Item>
                <div className='flex flex-wrap gap-3 items-center'>
                  <Button type='primary' htmlType='submit' loading={submitting}>
                    Submit Ticket
                  </Button>
                  <Divider type='vertical' />
                  <Button icon={<MessageOutlined />} onClick={openChatWidget} type='default'>
                    Live Chat Support
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Card>
        </div>
        {!isLive && (
          <Alert
            message='Your stream is offline, and Dotabod will only work once you start streaming and go online.'
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
        canonicalUrl: 'https://dotabod.com/dashboard/troubleshoot',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export default TroubleshootPage
