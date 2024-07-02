import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'

const OverlayPage = () => {
  const { data } = useSession()

  return (
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
          title="overlay"
          src={`/overlay/${data?.user?.id}`}
          className="rounded-lg border border-gray-500"
          style={{
            aspectRatio: '16/9',
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </>
  )
}

OverlayPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default OverlayPage
