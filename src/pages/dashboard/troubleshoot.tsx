import DashboardShell from '@/components/Dashboard/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import { ReactElement } from 'react'
import Header from '@/components/Dashboard/Header'
import { Typography } from 'antd'

const faqs = [
  {
    question: "Overlay stuck, won't update?",
    answer: (
      <div>
        Press refresh on the dotabod overlay source in OBS. Or, restart OBS.
        <Image
          src="https://i.imgur.com/d0qzlFa.png"
          alt="OBS dotabod source"
          width={589}
          height={140}
        />
      </div>
    ),
  },
  {
    question: 'Overlay not showing anything?',
    answer:
      'Check that you placed the cfg file in the correct folder. It goes in /gamestate_integration/, not in /cfg/. Add -gamestateintegration to Dota launch options. Restart Dota. OBS dotabod browser source must be above your other sources so it doesnt get blocked. Right click the dotabod source in preview, click transform, and click fit to content so it resizes and fills your screen.',
  },
  {
    question: 'Dotabod keeps saying play a match, no steam id?',
    answer:
      'You probably placed the cfg file in the wrong folder. Follow Step 2 of setup again. Reboot Dota after finding the right folder. Play a bot match to verify Dotabod can find your account. Still nothing? Could your Steam account be linked to another Dotabod user? Only one person may have the Steam account linked. To remove it from the other user, join the Dotabod discord to get help verifying your steam account.',
  },
  {
    question: 'MMR not tracking?',
    answer: 'Enter your current MMR in the dashboard so that it isnt 0.',
  },
  {
    question: 'How do I test that it works?',
    answer:
      'Try loading a solo bot match. If OBS is showing your overlays, it works. Also type !ping in your Twitch chat to make sure dotabod can type. And you can spectate a live pro match and type !np to confirm again.',
  },
  {
    question: 'Can I still use 9kmmrbot?',
    answer: (
      <span>
        I&apos;d remove it if I were you. Dotabod has all the features 9kmmrbot
        had, and more. Visit{' '}
        <Typography.Link
          target="_blank"
          href="https://twitch.tv/popout/9kmmrbot/chat"
        >
          9kmmrbot chat
        </Typography.Link>{' '}
        and type <code>!part</code> to remove 9kmmrbot. You may have to ban
        9kmmrbot from your channel because it may keep trying to join and
        respond to commands still.
      </span>
    ),
  },
  {
    question: "Why do bets open right when I pick? Can't I get counter picked?",
    answer:
      'Bets open when its no longer possible to counter pick or counter ban your hero. That is to say, when the enemy can now see who you picked in-game.',
  },
  {
    question: 'Still not working?',
    answer: (
      <span>
        Get help in our{' '}
        <Typography.Link target="_blank" href="https://discord.dotabod.com">
          Discord
        </Typography.Link>
        .
      </span>
    ),
  },
]

const TroubleshootPage = () => {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Troubleshooting</title>
      </Head>
      <Header
        subtitle="Try these steps in case something isn't working."
        title="Troubleshooting"
      />
      <div className="mt-12 lg:col-span-2 lg:mt-0">
        <dl className="space-y-12">
          {faqs.map(
            (faq) =>
              faq.question && (
                <div key={faq.question}>
                  <dt className="text-lg font-medium leading-6">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 text-base text-dark-300">{faq.answer}</dd>
                </div>
              )
          )}
        </dl>
      </div>
    </>
  ) : null
}

TroubleshootPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default TroubleshootPage
