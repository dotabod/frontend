import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { SessionProvider } from 'next-auth/react'

import SentrySession from '@/components/SentrySession'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { SubscriptionProviderMain } from '@/hooks/SubscriptionProvider'
import store from '@/lib/redux/store'
import themeConfig from '@/lib/theme/themeConfig'
import '@/styles/tailwind.css'
import { StyleProvider, createCache } from '@ant-design/cssinjs'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { GoogleAnalytics } from '@next/third-parties/google'
import { App as AntProvider, ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import 'focus-visible'
import type { NextPage } from 'next'
import type { Session } from 'next-auth'
import type { AppProps } from 'next/app'
import { type ReactElement, type ReactNode, useEffect, useState } from 'react'
import { Provider } from 'react-redux'

export type NextPageWithLayout<P = Record<string, unknown>, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
  session: Session
}

// Create a singleton cache for client-side
const clientCache = createCache()

// Use of the <SessionProvider> is mandatory to allow components that call
// `useSession()` anywhere in your application to access the `session` object.
const App = ({ Component, pageProps: { session, ...pageProps } }: AppPropsWithLayout) => {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page)

  // Fix for hydration issues
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use a simple layout during SSR, and the full layout after mounting on the client
  const content = (
    <ConfigProvider theme={themeConfig}>
      <SentrySession />
      <VercelAnalytics />
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''} />
      <MantineProvider>
        <Provider store={store}>
          <AntProvider>{getLayout(<Component {...pageProps} />)}</AntProvider>
        </Provider>
      </MantineProvider>
    </ConfigProvider>
  )

  return (
    <SessionProvider session={session}>
      <SubscriptionProviderMain>
        <SubscriptionProvider>
          <StyleProvider cache={clientCache} hashPriority="high">
            {mounted ? content : <div style={{ visibility: 'hidden' }}>{content}</div>}
          </StyleProvider>
        </SubscriptionProvider>
      </SubscriptionProviderMain>
    </SessionProvider>
  )
}

export default App
