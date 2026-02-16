import Head from 'next/head'
import type { ReactElement } from 'react'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import ChatterCard from '@/components/Dashboard/Features/ChatterCard'
import Header from '@/components/Dashboard/Header'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import type { NextPageWithLayout } from '@/pages/_app'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Chat features</title>
    </Head>

    <Header
      subtitle='The bot reacts with chat messages to your game events as you play your match.'
      title='Chatter'
    />

    <div id='chatter'>
      <ChatterCard />
    </div>
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export const getServerSideProps = requireDashboardAccess()

export default FeaturesPage
