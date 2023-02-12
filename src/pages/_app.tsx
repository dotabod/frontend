import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { SessionProvider } from 'next-auth/react'

import '@/styles/tailwind.css'
import 'focus-visible'

import type { Session } from 'next-auth'
import { GeistProvider, Themes } from '@geist-ui/core'
import { MantineProvider } from '@mantine/core'
import { NotificationsProvider } from '@mantine/notifications'
import { GoogleAnalytics } from 'nextjs-google-analytics'
import SentrySession from '@/components/SentrySession'
import 'antd/dist/reset.css'
import { ConfigProvider, theme } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import type { ReactElement, ReactNode } from 'react'

const myTheme1 = Themes.createFromDark({
  type: 'coolTheme',
  palette: {
    background: '#17181e',
    foreground: '#F2F4FB',
  },
})

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
          <MantineProvider
            withCSSVariables
            theme={{
              colorScheme: 'dark',
              colors: {
                blue: [
                  '#eff6ff',
                  '#dbeafe',
                  '#bfdbfe',
                  '#93c5fd',
                  '#60a5fa',
                  '#3b82f6',
                  '#2563eb',
                  '#1d4ed8',
                  '#1e40af',
                  '#1e3a8a',
                ],
                // override dark colors to change them for all components
                dark: [
                  '#F9FAFB',
                  'rgb(242,244,251)',
                  'rgb(198,200,215)',
                  'rgb(145,149,171)',
                  'rgb(101,106,131)',
                  'rgb(61,65,85)',
                  'rgb(49,52,66)',
                  'rgb(39,41,52)',
                  'rgb(31,33,41)',
                  'rgb(23,24,30)',
                ],
              },
            }}
          >
            <SentrySession />
            <VercelAnalytics />
            <GoogleAnalytics />
            <NotificationsProvider position="top-center">
              <GeistProvider themes={[myTheme1]} themeType="coolTheme">
                {getLayout(<Component {...pageProps} />)}
              </GeistProvider>
            </NotificationsProvider>
          </MantineProvider>
        </StyleProvider>
      </ConfigProvider>
    </SessionProvider>
  )
}
