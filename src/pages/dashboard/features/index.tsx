import DashboardShell from '@/components/Dashboard/DashboardShell'
import BetsCard from '@/components/Dashboard/Features/BetsCard'
import IdeaCard from '@/components/Dashboard/Features/IdeaCard'
import LanguageCard from '@/components/Dashboard/Features/LanguageCard'
import MmrTrackerCard from '@/components/Dashboard/Features/MmrTrackerCard'
import StreamDelayCard from '@/components/Dashboard/Features/StreamDelay'
import Header from '@/components/Dashboard/Header'
import type { NextPageWithLayout } from '@/pages/_app'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useTranslation } from 'next-i18next'

const FeaturesPage: NextPageWithLayout = () => {
  const { t } = useTranslation('common')

  return (
    <>
      <Head>
        <title>Dotabod | {t('dashboard.features.main.title')}</title>
      </Head>

      <Header
        subtitle={t('dashboard.features.main.subtitle')}
        title={t('dashboard.features.main.title')}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2">
        <LanguageCard />
        <StreamDelayCard />
        <MmrTrackerCard />
        <BetsCard />
        <IdeaCard />
      </div>
    </>
  )
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
