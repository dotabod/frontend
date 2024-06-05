import MinimapCard from '@/components/Dashboard/Features/MinimapCard'
import PicksCard from '@/components/Dashboard/Features/PicksCard'
import RoshCard from '@/components/Dashboard/Features/RoshCard'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import NotablePlayersCard from '@/components/Dashboard/Features/NotablePlayers'
import { ReactElement } from 'react'
import type { NextPageWithLayout } from '@/pages/_app'
import Header from '@/components/Dashboard/Header'
import QueueCard from '@/components/Dashboard/Features/QueueCard'
import MmrOverlay from '@/components/Overlay/MmrOverlay'
import BetsOverlay from '@/components/Overlay/BetsOverlay'
import WinProbabilityOverlay from '@/components/Overlay/WinProbabilityOverlay'
import { useTranslation } from 'react-i18next';

const FeaturesPage: NextPageWithLayout = () => {
  const { status } = useSession()
  const { t } = useTranslation();

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>{t('features.overlay.title')}</title>
      </Head>

      <Header
        subtitle={t('features.overlay.subtitle')}
        title={t('features.overlay.title')}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2">
        <MinimapCard />
        <PicksCard />
        <MmrOverlay />
        <BetsOverlay />
        <RoshCard />
        <QueueCard />
        <NotablePlayersCard />
        <WinProbabilityOverlay />
      </div>
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
