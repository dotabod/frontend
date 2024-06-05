import ChatterCard from '@/components/Dashboard/Features/ChatterCard'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import { ReactElement } from 'react'
import type { NextPageWithLayout } from '@/pages/_app'
import Header from '@/components/Dashboard/Header'
import { useTranslation } from 'react-i18next';

const FeaturesPage: NextPageWithLayout = () => {
  const { status } = useSession()
  const { t } = useTranslation();

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>{t('features.chat.title')}</title>
      </Head>

      <Header
        subtitle={t('features.chat.subtitle')}
        title={t('features.chat.title')}
      />

      <ChatterCard />
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
