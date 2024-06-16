import DashboardShell from '@/components/Dashboard/DashboardShell'
import BetsCard from '@/components/Dashboard/Features/BetsCard'
import IdeaCard from '@/components/Dashboard/Features/IdeaCard'
import LanguageCard from '@/components/Dashboard/Features/LanguageCard'
import MmrTrackerCard from '@/components/Dashboard/Features/MmrTrackerCard'
import StreamDelayCard from '@/components/Dashboard/Features/StreamDelay'
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
        <title>Dotabod | Main features</title>
      </Head>

      <Header
        subtitle="Customize the options your stream receives."
        title="Main features"
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
