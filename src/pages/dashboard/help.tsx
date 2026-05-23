import { MessageOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Collapse,
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
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import {
  CfgLocationNote,
  LiveRequiredNote,
  PowerShellFailureSteps,
  PowerShellSetupStep,
} from '@/components/Dashboard/PowerShellTroubleshooting'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
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
        description: step,
        title: hideTitle ? undefined : `Step ${index + 1}`,
        ...stepProps?.[index],
      }))}
    />
  )
}

type FaqCategory = 'steam' | 'overlay' | 'chat' | 'setup' | 'concepts'

interface Faq {
  id: string
  category: FaqCategory
  question: string
  keywords: string[]
  answer: ReactNode
}

const categoryOrder: { id: FaqCategory; label: string }[] = [
  { id: 'steam', label: 'Steam & MMR' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'chat', label: 'Chat & testing' },
  { id: 'setup', label: 'Setup & connection' },
  { id: 'concepts', label: 'Good to know' },
]

const faqs: Faq[] = [
  {
    answer: (
      <div className='flex flex-col gap-3'>
        <LiveRequiredNote />
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
                <Tag>!innate</Tag> in chat: if Dotabod replies with your hero's innate, it found
                your Steam account.
              </div>
            </span>,
            <span key={2}>
              <strong>Confirm Steam appears in your MMR tracker</strong>
              <div className='mt-1 text-sm'>
                Open the <Link href='/dashboard/features'>Features page</Link>. Your Steam account
                should appear there with your avatar and MMR.
              </div>
            </span>,
          ]}
        />
        <Alert
          type='error'
          showIcon
          message='Still not connecting after you played while live?'
          description={
            <StepComponent
              hideTitle
              steps={[
                <PowerShellSetupStep key={0} />,
                <span key={1}>
                  <strong>Check the cfg file location</strong>
                  <div className='mt-1 text-sm'>
                    The cfg file may be in the wrong folder.{' '}
                    <Link href='/dashboard?step=2'>Follow Step 2</Link> again. <CfgLocationNote />
                  </div>
                </span>,
                <span key={2}>
                  <strong>Check for an account conflict</strong>
                  <div className='mt-1 text-sm'>
                    Your Steam account may be linked to another Dotabod user. Only one user can link
                    a Steam account at a time. Open{' '}
                    <Link href='/dashboard/features'>the MMR tracker on the Features page</Link> to
                    see who's currently using it. Ask them to remove the link, or use the support
                    form below for help unlinking.
                  </div>
                </span>,
                <span key={3}>
                  <strong>Still not working?</strong>
                  <div className='mt-1 text-sm'>
                    <PowerShellFailureSteps />
                  </div>
                </span>,
              ]}
            />
          }
        />
      </div>
    ),
    category: 'steam',
    id: 'steam-connect',
    keywords: ['steam', 'connect', 'mmr', 'account', 'innate', 'powershell', 'cfg', 'gsi'],
    question: "Steam won't connect",
  },
  {
    answer: (
      <span>
        <Link href='/dashboard/features'>Enter your current MMR</Link> on the Features page so we
        have a starting value.
      </span>
    ),
    category: 'steam',
    id: 'steam-mmr',
    keywords: ['mmr', 'rank', 'tracking', 'starting value'],
    question: 'MMR isn’t tracking',
  },
  {
    answer: (
      <StepComponent
        steps={[
          'In OBS, click Refresh on the Dotabod browser source.',
          'Confirm your stream is live.',
          'Remove the Dotabod browser source in OBS, then add it again.',
          'In OBS, right-click the Dotabod browser source, then choose Transform, then Fit to content.',
          "In OBS, move the Dotabod browser source above your other sources so they don't cover it.",
          <span key={5}>
            <strong>Using OBS 31 or later?</strong> A Chromium change in OBS 31+ can show blank
            overlays. If that's you:
            <div className='mt-2'>
              <a
                href='https://github.com/obsproject/obs-studio/releases/download/30.2.3/OBS-Studio-30.2.3-Windows-Installer.exe'
                target='_blank'
                rel='noreferrer'
              >
                Download OBS 30.2.3
              </a>{' '}
              and run the installer. You don't need to uninstall first.
            </div>
          </span>,
          <span key={6}>
            <strong>Check the cfg file location.</strong>
            <div className='mt-1 text-sm'>
              <CfgLocationNote />
            </div>
          </span>,
          'Restart OBS, the Dota client, and Steam.',
          <span key={8}>
            <strong>Regional blocking note</strong>
            <div className='mt-1 text-sm'>
              Some ISPs and networks block Cloudflare, which can hide the overlay. If that's you,
              try the community tool{' '}
              <a
                href='https://github.com/Flowseal/zapret-discord-youtube'
                target='_blank'
                rel='noreferrer'
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
              >
                v1.9.0b
              </a>
              .
            </div>
          </span>,
        ]}
      />
    ),
    category: 'overlay',
    id: 'overlay',
    keywords: [
      'overlay',
      'obs',
      'browser source',
      'blank',
      'stuck',
      'refresh',
      'cloudflare',
      'gsi',
    ],
    question: 'Overlay isn’t showing or won’t update',
  },
  {
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
    category: 'chat',
    id: 'chat-talk',
    keywords: ['chat', 'talk', 'ban', 'unban', 'ping', 'rejoin'],
    question: "Dotabod won't talk in chat",
  },
  {
    answer: (
      <StepComponent
        steps={[
          <span key={1}>
            Type <Tag>!ping</Tag> in your Twitch chat to make sure Dotabod can type.
          </span>,
          <span key={2}>
            Spectate a live pro match and type <Tag>!np</Tag> to confirm Dotabod responds with the
            notable players.
          </span>,
        ]}
      />
    ),
    category: 'chat',
    id: 'chat-test',
    keywords: ['test', 'ping', 'np', 'notable players', 'works'],
    question: 'How do I test that it works?',
  },
  {
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
    category: 'setup',
    id: 'setup-chrome',
    keywords: ['chrome', 'local network', 'installer', 'obs', 'websocket', 'permission', 'denied'],
    question: 'Chrome says "Local network access denied", or the installer or OBS won\'t connect',
  },
  {
    answer: (
      <div className='flex flex-col gap-3'>
        <p>
          Dotabod is a streaming tool, so it activates only when you're live on Twitch. That
          includes detecting and connecting your Steam account.
        </p>
        <LiveRequiredNote />
        <div>
          <strong>First-time setup, in order:</strong>
          <ol className='mt-2 list-inside list-decimal space-y-1'>
            <li>Run the PowerShell script once during setup (offline is fine).</li>
            <li>Start streaming on Twitch.</li>
            <li>Play a match or demo a hero.</li>
            <li>Steam connects and appears in your MMR tracker.</li>
            <li>
              You're done. Future matches auto-connect, regardless of stream status, and you never
              need to run the script again.
            </li>
          </ol>
        </div>
      </div>
    ),
    category: 'concepts',
    id: 'concept-live',
    keywords: ['live', 'stream', 'steam', 'connect', 'offline', 'why'],
    question: 'Why does my stream need to be live to connect Steam?',
  },
  {
    answer:
      "Bets open once your pick is visible to the enemy team in-game. By then, they can't counter-pick or counter-ban your hero anyway.",
    category: 'concepts',
    id: 'concept-bets',
    keywords: ['bets', 'pick', 'counter', 'predictions'],
    question: "Why do bets open right when I pick? Can't I get counter-picked?",
  },
  {
    answer: (
      <div className='flex flex-col space-y-4'>
        <div>
          Running Dotabod and 9kmmrbot together works fine. Your chat might not love the double-bot
          spam, though.
        </div>
        <div>
          9kmmrbot can no longer pull game data for accounts outside the high immortal bracket
          (roughly the top 1000 players). Dotabod&apos;s integration works at every rank.
        </div>
      </div>
    ),
    category: 'concepts',
    id: 'concept-9kmmrbot',
    keywords: ['9kmmrbot', 'bot', 'immortal', 'compatibility'],
    question: 'Can I still use 9kmmrbot?',
  },
]

const TroubleshootPage = () => {
  const session = useSession()
  const { data } = useSWR('/api/settings', fetcher, SETTINGS_SWR_OPTIONS)
  const isLive = data?.stream_online
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [hubspotBlocked, setHubspotBlocked] = useState(false)
  const [query, setQuery] = useState('')
  const [openKeys, setOpenKeys] = useState<string[]>([])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredFaqs = useMemo(() => {
    if (!normalizedQuery) {
      return faqs
    }
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(normalizedQuery) ||
        faq.keywords.some((keyword) => keyword.includes(normalizedQuery)),
    )
  }, [normalizedQuery])

  const handleSearch = (value: string) => {
    setQuery(value)
    const next = value.trim().toLowerCase()
    if (next) {
      setOpenKeys(
        faqs
          .filter(
            (faq) =>
              faq.question.toLowerCase().includes(next) ||
              faq.keywords.some((keyword) => keyword.includes(next)),
          )
          .map((faq) => faq.id),
      )
    } else {
      setOpenKeys([])
    }
  }

  const handleCollapseChange = (categoryIds: string[]) => (keys: string | string[]) => {
    const next = Array.isArray(keys) ? keys : [keys]
    setOpenKeys((prev) => [...prev.filter((key) => !categoryIds.includes(key)), ...next])
  }

  // Check if HubSpot is blocked
  useEffect(() => {
    let checkAttempts = 0
    const maxAttempts = 5 // 2.5 seconds with 500ms interval
    let checkInterval: NodeJS.Timeout | null = null

    const checkHubspotAvailability = () => {
      // Check if HubSpot script loaded properly
      const hubspotLoaded = window.HubSpotConversations !== undefined

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
      // The widget loads lazily (loadImmediately: false), so load+open covers the
      // Not-yet-loaded case; open() handles the already-loaded case.
      window.HubSpotConversations.widget.load({ widgetOpen: true })
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
        context: {
          pageName: 'Dotabod Troubleshooting',
          pageUri: window.location.href,
        },
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
        subtitle='Common fixes for setup, overlay, Steam, and chat issues. Search for your problem, or send us a message at the bottom if you’re still stuck.'
        title='Troubleshooting'
      />

      <div className='max-w-3xl space-y-8'>
        {!isLive && (
          <Alert
            message="Your stream is offline. Some features (like first-time Steam detection) only run while you're live."
            type='warning'
            showIcon
          />
        )}

        <Input
          allowClear
          size='large'
          prefix={<SearchOutlined className='text-gray-500' />}
          placeholder='Search problems, e.g. overlay, steam, chat'
          value={query}
          onChange={(event) => handleSearch(event.target.value)}
          aria-label='Search troubleshooting topics'
        />

        {filteredFaqs.length === 0 ? (
          <p className='text-gray-400'>
            No problems match “{query.trim()}”. Try a different word, or send us a message below.
          </p>
        ) : (
          <div className='space-y-8'>
            {categoryOrder.map((category) => {
              const items = filteredFaqs.filter((faq) => faq.category === category.id)
              if (items.length === 0) {
                return null
              }
              const categoryIds = items.map((faq) => faq.id)
              return (
                <section key={category.id} className='space-y-3'>
                  <h2 className='text-xs font-medium uppercase tracking-[0.2em] text-gray-500'>
                    {category.label}
                  </h2>
                  <Collapse
                    activeKey={openKeys}
                    onChange={handleCollapseChange(categoryIds)}
                    items={items.map((faq) => ({
                      children: <div className='text-gray-300'>{faq.answer}</div>,
                      key: faq.id,
                      label: faq.question,
                    }))}
                  />
                </section>
              )
            })}
          </div>
        )}

        <Card className='flex flex-col gap-4' title='Still stuck? Send us a message'>
          {hubspotBlocked && (
            <Alert
              banner
              message="Live chat couldn't load. Your browser or an extension may be blocking it."
              type='warning'
              showIcon
            />
          )}

          <Form
            form={form}
            layout='vertical'
            onFinish={handleSubmit}
            className='flex flex-col gap-4'
          >
            <Form.Item
              name='message'
              label='Message'
              extra='Tell us what you tried, what happened, and any error text you saw.'
              rules={[
                {
                  message: 'Add a message so we can help.',
                  required: true,
                },
                {
                  message: 'Add a bit more detail. We need at least 80 characters to help.',
                  min: 80,
                },
              ]}
            >
              <Input.TextArea placeholder='Describe the problem in your own words' rows={4} />
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
    </>
  )
}

TroubleshootPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        canonicalUrl: 'https://dotabod.com/dashboard/help',
        description: 'Troubleshoot and resolve issues with your Dotabod setup.',
        noindex: true,
        title: 'Troubleshooting | Dotabod Dashboard',
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess()

export default TroubleshootPage
