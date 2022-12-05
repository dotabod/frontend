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
    question: 'MMR not tracking?',
    answer:
      'Enter your current MMR in the dashboard so that it isnt 0. You must also add the dotabod overlay to OBS for MMR tracking to start. It will not track without the overlay.',
  },
  {
    question: '',
    answer: '',
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
      <DashboardShell title="Troubleshooting">
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
