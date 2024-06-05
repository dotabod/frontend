import BetsCard from '@/components/Dashboard/Features/BetsCard'
import MmrTrackerCard from '@/components/Dashboard/Features/MmrTrackerCard'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import LanguageCard from '@/components/Dashboard/Features/LanguageCard'
import StreamDelayCard from '@/components/Dashboard/Features/StreamDelay'
import { ReactElement } from 'react'
import type { NextPageWithLayout } from '@/pages/_app'
import Header from '@/components/Dashboard/Header'
import IdeaCard from '@/components/Dashboard/Features/IdeaCard'
import { useTranslation } from 'react-i18next';

const FeaturesPage: NextPageWithLayout = () => {
  const { status } = useSession()
  const { t } = useTranslation();

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>{t('features.main.title')}</title>
      </Head>

      <Header
        subtitle={t('features.main.subtitle')}
        title={t('features.main.title')}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2">
        <LanguageCard />
        <StreamDelayCard />
        <IdeaCard />
        <MmrTrackerCard />
        <BetsCard />
      </div>
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
