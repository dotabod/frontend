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
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          components: {
            Button: {
              colorLink: 'var(--color-purple-300)',
              colorPrimaryHover: 'var(--color-purple-300)',
            },
            Tabs: {
              colorPrimary: 'var(--color-purple-400)',
              itemHoverColor: 'var(--color-purple-300)',
            },
            Menu: {
              colorSubItemBg: 'var(--color-gray-800)',
              colorItemBgHover: 'var(--color-gray-700)',
              colorItemBgSelected: 'var(--color-gray-600)',
              colorItemTextSelected: 'var(--color-gray-200)',
              colorItemText: 'var(--color-gray-300)',

            },
            Switch: {
              colorPrimary: 'var(--color-purple-900)',
            },
          },
          token: {
            colorPrimary: 'rgb(85, 24, 103)',
            colorLink: 'var(--color-purple-500)',
            colorLinkActive: 'var(--color-purple-300)',
            colorLinkHover: 'var(--color-purple-300)',
            colorText: 'var(--color-gray-200)',
            colorBgLayout: 'var(--color-gray-900)',
            colorBgContainer: 'var(--color-gray-800)',
          },
        }}
      >
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
