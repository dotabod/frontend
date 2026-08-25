import Head from 'next/head'
import type { ReactElement } from 'react'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { TierSwitch } from '@/components/Dashboard/Features/TierSwitch'
import WhatsNewFeatureCard from '@/components/Dashboard/Features/WhatsNewFeatureCard'
import Header from '@/components/Dashboard/Header'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import { groupWhatsNewByDate, whatsNewSorted } from '@/lib/whatsNew'
import type { NextPageWithLayout } from '@/pages/_app'
import { Card } from '@/ui/card'
import { formatDate } from '@/utils/formatDate'

const WhatsNewPage: NextPageWithLayout = () => {
  const { data: master } = useUpdateSetting<boolean>(Settings.autoOptInNewFeatures)
  const entries = whatsNewSorted
  const groups = groupWhatsNewByDate(entries)

  return (
    <>
      <Head>
        <title>Dotabod | What&apos;s new</title>
      </Head>
      <Header
        title="What's new"
        subtitle='The latest Dotabod features, commands, and pages. Flip any of them on or off right here.'
      />

      <Card className='mb-6'>
        <TierSwitch
          settingKey={Settings.autoOptInNewFeatures}
          label='Automatically enable new features as they launch'
        />
      </Card>

      <div className='space-y-10'>
        {groups.map((group) => (
          <section key={group.releaseDate} aria-labelledby={`release-${group.releaseDate}`}>
            <div className='mb-4 flex items-center gap-3'>
              <h2
                id={`release-${group.releaseDate}`}
                className='m-0! text-sm font-semibold text-gray-200'
              >
                <time dateTime={group.releaseDate}>{formatDate(group.releaseDate)}</time>
              </h2>
              <div className='h-px flex-1 bg-gray-700' aria-hidden='true' />
            </div>

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
              {group.entries.map((entry) => (
                <div id={entry.id} key={entry.id} className='scroll-mt-6'>
                  <ErrorBoundary>
                    <WhatsNewFeatureCard
                      entry={entry}
                      master={master}
                      latest={entry.id === entries[0]?.id}
                      showDate={false}
                    />
                  </ErrorBoundary>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

WhatsNewPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        canonicalUrl: 'https://dotabod.com/dashboard/whats-new',
        description: 'The latest Dotabod features, commands, and pages.',
        noindex: true,
        title: "What's New | Dotabod",
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess()

export default WhatsNewPage
