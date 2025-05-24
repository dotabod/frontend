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

export default FeaturesPage
