import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { SessionProvider } from 'next-auth/react'

import '@/styles/tailwind.css'
import 'focus-visible'

import SentrySession from '@/components/SentrySession'
import store from '@/lib/redux/store'
import { StyleProvider } from '@ant-design/cssinjs'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { GoogleAnalytics } from '@next/third-parties/google'
import { App as AntProvider, ConfigProvider, theme } from 'antd'
import 'antd/dist/reset.css'
import type { NextPage } from 'next'
import type { Session } from 'next-auth'
import type { AppProps } from 'next/app'
import type { ReactElement, ReactNode } from 'react'
import { Provider } from 'react-redux'

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
            Spin: {
              colorPrimary: 'var(--color-purple-300)',
            },
            Button: {
              colorLink: 'var(--color-purple-300)',
              colorPrimaryHover: 'var(--color-purple-300)',
            },
            Tabs: {
              colorPrimary: 'var(--color-purple-400)',
              itemHoverColor: 'var(--color-purple-300)',
            },
            Menu: {
              subMenuItemBg: 'var(--color-gray-800)',
              itemHoverBg: 'var(--color-gray-700)',
              itemSelectedBg: 'var(--color-gray-600)',
              itemSelectedColor: 'var(--color-gray-200)',
              itemColor: 'var(--color-gray-300)',
            },
            Switch: {
              colorPrimary: 'var(--color-purple-900)',
            },
            Steps: {
              colorPrimary: 'var(--color-purple-500)',
              colorPrimaryHover: 'var(--color-purple-300)',
              colorPrimaryActive: 'var(--color-purple-300)',
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
          <VercelAnalytics
            debug
            beforeSend={(event) => {
              if (event.type === 'event') {
                return {
                  ...event,
                  user: session?.user?.id,
                }
              }
              return event
            }}
          />
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
          <MantineProvider>
            <Provider store={store}>
              <AntProvider>
                {getLayout(<Component {...pageProps} />)}
              </AntProvider>
            </Provider>
          </MantineProvider>
        </StyleProvider>
      </ConfigProvider>
    </SessionProvider>
  )
}

export default App
