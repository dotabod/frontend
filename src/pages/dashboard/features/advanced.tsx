import DashboardShell from '@/components/Dashboard/DashboardShell'
import SceneSwitcher from '@/components/Dashboard/Features/SceneSwitcher'
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
        <title>Dotabod | Advanced features</title>
      </Head>

      <Header
        subtitle="Looking for even more? They'll be here 😎"
        title="Advanced features"
      />

      <SceneSwitcher />
    </>
  ) : null
}

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
