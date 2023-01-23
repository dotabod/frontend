import DashboardShell from '@/components/Dashboard/DashboardShell'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

export default function TroubleshootPage() {
  const { status, data } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Troubleshooting</title>
      </Head>
      <DashboardShell
        subtitle="Try these steps in case something isn't working."
        title="Troubleshooting"
      >
        <div className="mt-12 origin-top-left lg:col-span-2 lg:mt-0 ">
          <iframe
            src={`/overlay/${data?.user?.id}`}
            className="rounded-lg border border-gray-200"
            width="100%"
            height="600"
          />
        </div>
      </DashboardShell>
    </>
  ) : null
}