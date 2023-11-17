import Head from 'next/head'

import { AuthLayout } from '@/components/Homepage/AuthLayout'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { App } from 'antd'
import * as Sentry from '@sentry/nextjs'
import { LoginButton } from '@/components/Homepage/LoginButton'

export default function Login() {
  const { status } = useSession()
  const { message } = App.useApp()
  const router = useRouter()

  const showError = () => {
    Sentry.captureMessage('Login error', {
      tags: {
        page: 'login',
      },
    })

    message.error({
      key: 'login-error',
      duration: 50000,
      content: (
        <span>
          Oops. Unable to log you in. This usually happens if you already have
          an account on Dotabod under the same email. Try to change your email
          on twitch.tv to something new and login again. Reach out to us on{' '}
          <a href="https://discord.dotabod.com" target="_blank">
            Discord
          </a>{' '}
          for more help.
        </span>
      ),
    })
  }

  useEffect(() => {
    if (status === 'authenticated') {
      void router.push('/dashboard')
    }
  }, [router, status])

  useEffect(() => {
    if (
      status !== 'authenticated' &&
      router.asPath.toLowerCase().includes('error')
    ) {
      showError()
    }
  }, [router.asPath, status])

  if (status === 'authenticated') return null

  return (
    <>
      <Head>
        <title>Sign In - Dotabod</title>
      </Head>
      <AuthLayout
        title="Sign in"
        subtitle="You can begin using Dotabod right away!"
      >
        <LoginButton block size="large" />
      </AuthLayout>
    </>
  )
}
