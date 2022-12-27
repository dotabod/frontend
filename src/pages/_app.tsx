import { Analytics } from '@vercel/analytics/react'
import { SessionProvider } from 'next-auth/react'

import '@/styles/tailwind.css'
import 'focus-visible'

import type { AppProps } from 'next/app'
import type { Session } from 'next-auth'
import { GeistProvider, Themes } from '@geist-ui/core'
import { MantineProvider } from '@mantine/core'

const myTheme1 = Themes.createFromDark({
  type: 'coolTheme',
  palette: {
    background: '#17181e',
    foreground: '#F2F4FB',
  },
})

// Use of the <SessionProvider> is mandatory to allow components that call
// `useSession()` anywhere in your application to access the `session` object.
export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  return (
    <SessionProvider session={session}>
      <MantineProvider
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
        <GeistProvider themes={[myTheme1]} themeType="coolTheme">
          <Component {...pageProps} />
          <Analytics />
        </GeistProvider>
      </MantineProvider>
    </SessionProvider>
  )
}
