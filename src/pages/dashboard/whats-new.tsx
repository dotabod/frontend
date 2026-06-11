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
import { whatsNew } from '@/lib/whatsNew'
import type { NextPageWithLayout } from '@/pages/_app'
import { Card } from '@/ui/card'

const WhatsNewPage: NextPageWithLayout = () => {
  const { data: master } = useUpdateSetting<boolean>(Settings.autoOptInNewFeatures)
  const entries = [...whatsNew].sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
  )

  return (
    <>
      <Head>
        <title>Dotabod | What&apos;s new</title>
      </Head>
      <Header
        title="What's new"
        subtitle='The latest Dotabod features, commands, and pages — newest first. Flip any of them on or off right here.'
      />

      <Card className='mb-6'>
        <TierSwitch
          settingKey={Settings.autoOptInNewFeatures}
          label='Automatically enable new features as they launch'
        />
      </Card>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {entries.map((entry, i) => (
          <div id={entry.id} key={entry.id}>
            <ErrorBoundary>
              <WhatsNewFeatureCard entry={entry} master={master} latest={i === 0} />
            </ErrorBoundary>
          </div>
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
