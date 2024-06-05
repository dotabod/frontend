import SceneSwitcher from '@/components/Dashboard/Features/SceneSwitcher'
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
        <title>{t('features.advanced.title')}</title>
      </Head>

      <Header
        subtitle={t('features.advanced.subtitle')}
        title={t('features.advanced.title')}
      />

      <SceneSwitcher />
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
