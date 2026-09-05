import Head from 'next/head'
import type { ReactElement } from 'react'

import DashboardShell from '@/components/Dashboard/DashboardShell'
import { TierSwitch } from '@/components/Dashboard/Features/TierSwitch'
import WhatsNewFeed from '@/components/Dashboard/Features/WhatsNewFeed'
import Header from '@/components/Dashboard/Header'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import { whatsNewSorted } from '@/lib/whatsNew'
import type { NextPageWithLayout } from '@/pages/_app'

const WhatsNewPage: NextPageWithLayout = () => {
  const { data: master } = useUpdateSetting(Settings.autoOptInNewFeatures)

  return (
    <>
      <Head>
        <title>Dotabod | What&apos;s new</title>
      </Head>
      <Header
        title="What's new"
        subtitle='See what changed, try real examples, and choose which optional features run on your stream.'
      />

      <section
        aria-labelledby='new-feature-defaults'
        className='mb-10 rounded-lg border border-gray-700 bg-gray-900 p-5 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-6'
      >
        <div className='max-w-2xl'>
          <h2 id='new-feature-defaults' className='m-0! text-base font-semibold text-gray-100'>
            New feature defaults
          </h2>
          <p className='mt-1 mb-0! text-sm leading-6 text-gray-400'>
            Choose what happens when Dotabod releases an optional feature. A switch on an individual
            update always overrides this default.
          </p>
        </div>
        <TierSwitch
          className='mt-4 shrink-0 sm:mt-0'
          settingKey={Settings.autoOptInNewFeatures}
          label='Turn on new features automatically'
        />
      </section>

      <WhatsNewFeed entries={whatsNewSorted} master={master} />
    </>
  )
}

WhatsNewPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        canonicalUrl: 'https://dotabod.com/dashboard/whats-new',
        description: 'Recent Dotabod releases, examples, and optional feature controls.',
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
