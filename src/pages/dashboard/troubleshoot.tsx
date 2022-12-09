import DashboardShell from '@/components/DashboardShell'
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
    answer: 'Add the OBS overlay, step 3 of setup.',
  },
  {
    question: 'MMR not tracking?',
    answer:
      'Enter your current MMR in the dashboard so that it isnt 0. You must also add the dotabod overlay to OBS for MMR tracking to start. It will not track without the overlay.',
  },
  {
    question: 'How do I test that it works?',
    answer:
      'Try loading a solo bot match. If OBS is showing your overlays, it works. Also type !ping in your Twitch chat to make sure dotabod can type.',
  },
  {
    question: 'Can I still use 9kmmrbot?',
    answer:
      "I'd remove it if I were you. Dotabod has all the features 9kmmrbot had, and more. Visit https://www.twitch.tv/popout/9kmmrbot/chat and type !part to remove 9kmmrbot.",
  },
  {
    question: "Why do bets open right when I pick? Can't I get counter picked?",
    answer:
      'Bets open when its no longer possible to counter pick or counter ban your hero. That is to say, when the enemy can now see who you picked in-game.',
  },
  {
    question: 'Still not working?',
    answer: 'Get help in our Discord.',
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
        subtitle="In case something isn't working."
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
