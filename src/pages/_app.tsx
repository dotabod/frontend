import { SessionProvider } from 'next-auth/react'

import '@/styles/tailwind.css'
import 'focus-visible'

import type { AppProps } from 'next/app'
import type { Session } from 'next-auth'
import { GeistProvider } from '@geist-ui/core'
import { MantineProvider } from '@mantine/core'

// Use of the <SessionProvider> is mandatory to allow components that call
// `useSession()` anywhere in your application to access the `session` object.
export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  return (
    <SessionProvider session={session}>
      <MantineProvider>
        <GeistProvider>
          <Component {...pageProps} />
        </GeistProvider>
      </MantineProvider>
    </SessionProvider>
  )
}
