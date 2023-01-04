import DashboardShell from '@/components/DashboardShell'
import { Link } from '@geist-ui/core'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

const faqs = [
  {
    question: 'Overlay not showing anything?',
    answer:
      'Check that you placed the cfg file in the correct folder. It goes in /gamestate_integration/, not in /cfg/. Add -gamestateintegration to Dota launch options. Restart Dota. OBS dotabod browser source must be above your other sources so it doesnt get blocked. Right click the dotabod source in preview, click transform, and click fit to content so it resizes and fills your screen.',
  },
  {
    question: 'Dotabod keeps saying play a match, no steam id?',
    answer:
      'You probably placed the cfg file in the wrong folder. Reboot Dota after finding the right folder.',
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
        <Link
          color
          target="_blank"
          href="https://twitch.tv/popout/9kmmrbot/chat"
        >
          9kmmrbot chat
        </Link>{' '}
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
        <Link color target="_blank" href="https://discord.dotabod.com">
          Discord
        </Link>
        .
      </span>
    ),
  },
]

export default function TroubleshootPage() {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Troubleshooting</title>
      </Head>
      <DashboardShell
        subtitle="Try these steps in case something isn't working."
        title="Troubleshooting"
      >
        <div className="mt-12 lg:col-span-2 lg:mt-0">
          <dl className="space-y-12">
            {faqs.map(
              (faq) =>
                faq.question && (
                  <div key={faq.question}>
                    <dt className="text-lg font-medium leading-6 text-white">
                      {faq.question}
                    </dt>
                    <dd className="mt-2 text-base text-dark-300">
                      {faq.answer}
                    </dd>
                  </div>
                )
            )}
          </dl>
        </div>
      </DashboardShell>
    </>
  ) : null
}
