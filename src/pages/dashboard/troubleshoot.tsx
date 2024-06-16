import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { Card } from '@/ui/card'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { ReactElement } from 'react'

const faqs = [
  {
    question: "Overlay stuck, won't update?",
    answer: (
      <div>
        <p>Try the following steps:</p>
        <ol className="list-inside list-decimal">
          <li>Press refresh on the dotabod overlay source in OBS.</li>
          <li>Restart OBS.</li>
          <li>Dotabod will only work if your stream is online.</li>
          <li>Try the steps under &quot;Overlay not showing anything?&quot;</li>
        </ol>
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
    question:
      'Unable to open bets. Your Twitch account needs to be reconnected to Dotabod',
    answer:
      'Logout and login again on the Dotabod dashboard to reconnect your Twitch account. Press your picture in the top right and click Logout. If it still does not work after logging in again, join our Discord.',
  },
  {
    question: "Dotabod won't talk in chat? Or accidentally banned Dotabod?",
    answer:
      'Try enabling and disabling Dotabod using the toggle in the top left of Dotabod dashboard. Then type !ping in chat to see if Dotabod can talk again.',
  },
  {
    question: 'Overlay not showing anything?',
    answer: (
      <div>
        <p>Try the following steps:</p>
        <ol className="list-inside list-decimal">
          <li>
            Make sure your stream is online. Dotabod will not work if you are
            offline.
          </li>
          <li>
            Update OBS to v29 or higher. Dotabod overlay will not show on v27
            for example
          </li>
          <li>
            Check that you placed the cfg file in the correct folder. It goes in
            /gamestate_integration/, not in /cfg/.
          </li>
          <li>Add -gamestateintegration to Dota launch options.</li>
          <li>Restart Dota.</li>
          <li>
            OBS dotabod browser source must be above your other sources so it
            doesn&apos;t get blocked.
          </li>
          <li>
            Right click the dotabod source in preview, click transform, and
            click fit to content so it resizes and fills your screen.
          </li>
        </ol>
      </div>
    ),
  },
  {
    question: 'Dotabod keeps saying play a match, no steam id?',
    answer: (
      <ol className="list-inside list-decimal">
        <li>
          You probably placed the cfg file in the wrong folder. Follow Step 2 of
          setup again. Reboot Dota after finding the right folder.
        </li>
        <li>Play a bot match to verify Dotabod can find your account.</li>
        <li>
          Still nothing? Could your Steam account be linked to another Dotabod
          user? Only one person may have the Steam account linked. Dotabod will
          tell you who is using your account from the MMR tracker in the{' '}
          <Link href="/dashboard/features">Features page</Link>. You can then
          ask them to remove it from their account.
        </li>
      </ol>
    ),
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
      <div>
        9kmmrbot is no longer able to retrieve game data for accounts outside of
        the high immortal bracket and for those with their Steam Profile &gt;
        Privacy Settings &gt; Game Details setting set to private.
        <br />
        <br />
        This is due to changes in the Valve rich presence system, which
        previously had a bug that allowed the bot to retrieve private data
        regardless of profile settings.
        <br />
        <br />
        It&apos;s worth noting that this change does not affect Dotabod&apos;s
        GSI integration, which is still operational and safe to use. If you are
        unable to use 9kmmrbot due to these changes, we recommend trying out
        Dotabod as it includes all the features 9kmmrbot had to offer and more.
        <br />
        <br />
        We hope this information helps clarify why 9kmmrbot may no longer be
        working for some users and encourage you to explore other aspects of
        Dotabod&apos;s services.
      </div>
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
        <a target="_blank" href="https://discord.dotabod.com" rel="noreferrer">
          Discord
        </a>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {faqs.map(
            (faq) =>
              faq.question && (
                <Card key={faq.question}>
                  <dt className="text-lg font-medium leading-6">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 text-base text-gray-300">{faq.answer}</dd>
                </Card>
              )
          )}
        </div>
      </div>
    </>
  ) : null
}

TroubleshootPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default TroubleshootPage
