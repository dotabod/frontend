import ErrorBoundary from '@/components/ErrorBoundary'
import SentrySession from '@/components/SentrySession'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { SubscriptionProviderMain } from '@/hooks/SubscriptionProvider'
import { useCookiePreferences } from '@/lib/cookieManager'
import store from '@/lib/redux/store'
import themeConfig from '@/lib/theme/themeConfig'
import '@/styles/tailwind.css'
import '@/styles/crypto-animations.css'
import { createCache, StyleProvider } from '@ant-design/cssinjs'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { App as AntProvider, ConfigProvider, unstableSetRender } from 'antd'
import 'antd/dist/reset.css'
import 'focus-visible'
import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import Script from 'next/script'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Provider } from 'react-redux'
import { checkForInvalidOverlay, InvalidOverlayPage } from '@/lib/overlayUtils'

const isInvalidLocalCheck = checkForInvalidOverlay(
  typeof window !== 'undefined' ? window.location.pathname : '',
)

// Define a type for the container with _reactRoot property
interface ContainerWithRoot extends Element {
  _reactRoot?: Root
}

// Add the unstableSetRender implementation
unstableSetRender((node, container) => {
  // Use the specific type instead of any
  const containerWithRoot = container as ContainerWithRoot
  containerWithRoot._reactRoot ||= createRoot(container)
  const root = containerWithRoot._reactRoot
  root.render(node)
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    root.unmount()
  }
})

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
  const router = useRouter()

  const isPublicOverlayRoute = router.pathname === '/overlay/[userId]'

  useEffect(() => {
    const pathOnly = router.asPath.split('?')[0].toLowerCase()

    if (pathOnly === '/[username]') {
      void router.replace('/login')
    }
  }, [router])

  // Fix for hydration issues
  const [mounted, setMounted] = useState(false)
  // Get cookie preferences
  const { preferences: cookieConsent, hasConsented } = useCookiePreferences()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Guard against undefined Component
  if (!Component) {
    return <div>Loading...</div>
  }

  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page)

  // Use a simple layout during SSR, and the full layout after mounting on the client
  const content = (
    <ConfigProvider theme={themeConfig}>
      {!isPublicOverlayRoute && <SentrySession />}

      {/* Only load Vercel Analytics if explicit consent has been given */}
      {hasConsented && cookieConsent.analytics && <VercelAnalytics />}

      {/* Only load Google Analytics if explicit consent has been given */}
      {hasConsented && cookieConsent.analytics && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''} />
      )}

      {/* Google Tag Manager with consent mode - only load if consent has been given */}
      {hasConsented && (
        <Script id='gtm-consent-mode' strategy='afterInteractive'>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'analytics_storage': '${cookieConsent.analytics ? 'granted' : 'denied'}',
              'ad_storage': '${cookieConsent.marketing ? 'granted' : 'denied'}',
              'functionality_storage': '${cookieConsent.necessary ? 'granted' : 'denied'}',
              'personalization_storage': '${cookieConsent.preferences ? 'granted' : 'denied'}'
            });
          `}
        </Script>
      )}

      <MantineProvider>
        <Provider store={store}>
          <AntProvider>
            <ErrorBoundary>{getLayout(<Component {...pageProps} />)}</ErrorBoundary>
          </AntProvider>
        </Provider>
      </MantineProvider>
    </ConfigProvider>
  )

  if (isInvalidLocalCheck) {
    // If it's a known invalid overlay, render the InvalidOverlayPage directly
    // and bypass the main layout and providers that might make API calls.
    // We also ensure it is mounted to avoid hydration issues with this conditional rendering path.
    return (
      <StyleProvider cache={clientCache} hashPriority='high'>
        <AntProvider>
          <InvalidOverlayPage />
        </AntProvider>
      </StyleProvider>
    )
  }

  const appContent = (
    <SubscriptionProviderMain>
      <SubscriptionProvider>
        <StyleProvider cache={clientCache} hashPriority='high'>
          {mounted ? content : <div style={{ visibility: 'hidden' }}>{content}</div>}
        </StyleProvider>
      </SubscriptionProvider>
    </SubscriptionProviderMain>
  )

  if (isPublicOverlayRoute) {
    return appContent
  }

  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      {appContent}
    </SessionProvider>
  )
}

export default App
