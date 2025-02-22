import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { fetcher } from '@/lib/fetcher'
import { Card } from '@/ui/card'
import { Alert, type StepProps, Steps, type StepsProps, Tag } from 'antd'
import Head from 'next/head'
import Link from 'next/link'
import type React from 'react'
import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import useSWR from 'swr'

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
          'Check your OBS version, you must be on v29 or higher.',
          <span key={2}>
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
            then ask them to remove it from their account. Or, join our{' '}
            <a target='_blank' href='https://help.dotabod.com' rel='noreferrer'>
              Discord server
            </a>{' '}
            and type /unlink-steam.
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
  {
    question: 'Still not working?',
    answer: (
      <span>
        Get help in our{' '}
        <a target='_blank' href='https://help.dotabod.com' rel='noreferrer'>
          Discord
        </a>
        .
      </span>
    ),
  },
]

const TroubleshootPage = () => {
  const { data } = useSWR('/api/settings', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
  const isLive = data?.stream_online

  return (
    <>
      <Head>
        <title>Dotabod | Troubleshooting</title>
      </Head>
      <Header subtitle="Try these steps in case something isn't working." title='Troubleshooting' />
      {!isLive && (
        <Alert
          message='Your stream is offline, and Dotabod will only work once you start streaming and go online.'
          type='warning'
          showIcon
          className='max-w-2xl'
        />
      )}
      <div className='mt-12 lg:col-span-2 lg:mt-0'>
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
  return <DashboardShell>{page}</DashboardShell>
}

export default TroubleshootPage
