import DashboardShell from '@/components/Dashboard/DashboardShell'
import SceneSwitcher from '@/components/Dashboard/Features/SceneSwitcher'
import Header from '@/components/Dashboard/Header'
import type { NextPageWithLayout } from '@/pages/_app'
import Head from 'next/head'
import Image from 'next/image'
import type { ReactElement } from 'react'

const FeaturesPage: NextPageWithLayout = () => (
  <>
    <Head>
      <title>Dotabod | Advanced features</title>
    </Head>

    <Header
      subtitle={
        <div className="flex flex-row items-center space-x-2">
          <span>Looking for even more? They'll be here</span>
          <Image
            src="https://cdn.7tv.app/emote/63071b80942ffb69e13d700f/1x.webp"
            width={24}
            height={24}
            alt="Krappa"
          />
        </div>
      }
      title="Advanced features"
    />

    <SceneSwitcher />
  </>
)

FeaturesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default FeaturesPage
