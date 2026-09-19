import Head from 'next/head'
import type { ReactElement } from 'react'

import DashboardShell from '@/components/Dashboard/dashboard-shell'
import { AutoCommandsCard } from '@/components/Dashboard/Features/auto-commands-card'
import ClippingCard from '@/components/Dashboard/Features/clipping-card'
import SceneSwitcher from '@/components/Dashboard/Features/scene-switcher'
import Header from '@/components/Dashboard/header'
import ErrorBoundary from '@/components/error-boundary'
import { requireDashboardAccess } from '@/lib/server/dashboard-access'
import type { NextPageWithLayout } from '@/pages/_app'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Advanced features</title>
    </Head>

    <Header title='Advanced features' />

    <ErrorBoundary>
      <ClippingCard />
    </ErrorBoundary>
    <ErrorBoundary>
      <SceneSwitcher />
    </ErrorBoundary>
    <ErrorBoundary>
      <AutoCommandsCard />
    </ErrorBoundary>
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export const getServerSideProps = requireDashboardAccess()

export default FeaturesPage
