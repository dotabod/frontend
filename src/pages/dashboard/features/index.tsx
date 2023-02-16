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

const FeaturesPage: NextPageWithLayout = () => {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Main features</title>
      </Head>

      <Header
        subtitle="Customize the options your stream receives."
        title="Main features"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2">
        <LanguageCard />
        <StreamDelayCard />
        <MmrTrackerCard />
        <BetsCard />
        <IdeaCard />
      </div>
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
