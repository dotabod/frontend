import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { SessionProvider } from 'next-auth/react'

import '@/styles/tailwind.css'
import 'focus-visible'

import type { Session } from 'next-auth'
import { GoogleAnalytics } from 'nextjs-google-analytics'
import SentrySession from '@/components/SentrySession'
import { ConfigProvider, theme, App as AntProvider } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import type { ReactElement, ReactNode } from 'react'
import 'antd/dist/reset.css'

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
  session: Session
}

// Use of the <SessionProvider> is mandatory to allow components that call
// `useSession()` anywhere in your application to access the `session` object.
export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithLayout) {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page)

  return (
    <SessionProvider session={session}>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          components: {
            Menu: {
              colorItemBgSelected: 'var(--mantine-color-dark-5)',
              colorItemTextSelected: 'var(--mantine-color-dark-1)',
            },
          },
          token: {
            colorBgLayout: 'var(--mantine-color-dark-8)',
            colorBgContainer: 'var(--mantine-color-dark-7)',
          },
        }}
      >
        <StyleProvider hashPriority="high">
          <SentrySession />
          <VercelAnalytics />
          <GoogleAnalytics />
          <AntProvider>{getLayout(<Component {...pageProps} />)}</AntProvider>
        </StyleProvider>
      </ConfigProvider>
    </SessionProvider>
  )
}
