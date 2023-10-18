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
import { appWithTranslation } from 'next-i18next'
import nextI18NextConfig from '../../next-i18next.config.js'
import 'antd/dist/reset.css'
import { Provider } from 'react-redux'
import store from '@/lib/redux/store'

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
  session: Session
}

// Use of the <SessionProvider> is mandatory to allow components that call
// `useSession()` anywhere in your application to access the `session` object.
const App = ({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithLayout) => {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page)

  return (
    <SessionProvider session={session}>
      <ConfigProvider>
        <StyleProvider hashPriority="high">
          <SentrySession />
          <VercelAnalytics />
          <GoogleAnalytics />
          <AntProvider>
            <Provider store={store}>
              {getLayout(<Component {...pageProps} />)}
            </Provider>
          </AntProvider>
        </StyleProvider>
      </ConfigProvider>
    </SessionProvider>
  )
}

export default appWithTranslation(App, nextI18NextConfig)
