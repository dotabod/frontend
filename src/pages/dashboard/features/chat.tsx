import DashboardShell from '@/components/Dashboard/DashboardShell'
import ChatterCard from '@/components/Dashboard/Features/ChatterCard'
import Header from '@/components/Dashboard/Header'
import type { NextPageWithLayout } from '@/pages/_app'
import Head from 'next/head'
import type { ReactElement } from 'react'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Chat features</title>
    </Head>

    <Header
      subtitle="The bot can post some random messages as you play your game."
      title="Chatter"
    />

    <ChatterCard />
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
