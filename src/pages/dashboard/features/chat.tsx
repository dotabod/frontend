import DashboardShell from '@/components/Dashboard/DashboardShell'
import ChatterCard from '@/components/Dashboard/Features/ChatterCard'
import Header from '@/components/Dashboard/Header'
import type { NextPageWithLayout } from '@/pages/_app'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'

const FeaturesPage: NextPageWithLayout = () => {
  const { status } = useSession()

  return status === 'authenticated' ? (
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
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
