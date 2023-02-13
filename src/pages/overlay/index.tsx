import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Header from '@/components/Dashboard/Header'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { ReactElement } from 'react'

const TroubleshootPage = () => {
  const { status, data } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Troubleshooting</title>
      </Head>

      <Header
        subtitle="Take a peak to see if your OBS is showing the correct overlay. Try joining a bot match to have this preview show the pick blocker, for example."
        title="Live preview"
      />
      <div className="mt-12 origin-top-left lg:col-span-2 lg:mt-0 ">
        <iframe
          src={`/overlay/${data?.user?.id}`}
          className="rounded-lg border border-gray-200"
          style={{
            aspectRatio: '16/9',
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </>
  ) : null
}

TroubleshootPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default TroubleshootPage
