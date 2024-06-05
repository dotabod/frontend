import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Header from '@/components/Dashboard/Header'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'; // Import useTranslation hook

const TroubleshootPage = () => {
  const { status, data } = useSession()
  const { t } = useTranslation(); // Initialize useTranslation hook

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>{t('troubleshoot.title')}</title> {/* Use t function for translation */}
      </Head>

      <Header
        subtitle={t('troubleshoot.subtitle')} {/* Use t function for translation */}
        title={t('troubleshoot.title')} {/* Use t function for translation */}
      />
      <div className="mt-12 origin-top-left lg:col-span-2 lg:mt-0 ">
        <iframe
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
  ) : null
}

TroubleshootPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default TroubleshootPage
