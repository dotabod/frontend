import { Container } from '@/components/Container'
import { UserAuthForm } from '@/components/Homepage/AuthForm'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import * as Sentry from '@sentry/nextjs'
import { App } from 'antd'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect } from 'react'

const Login: NextPageWithLayout = () => {
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
          <a
            href="https://discord.dotabod.com"
            target="_blank"
            rel="noreferrer"
          >
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
    } else if (
      status !== 'authenticated' &&
      router.asPath.toLowerCase().includes('setup-scopes')
    ) {
      message.info({
        key: 'scope-setup',
        duration: 50000,
        content: (
          <span>
            You've been logged out. Please login again to relink your account to
            Twitch. Reach out to us on{' '}
            <a
              href="https://discord.dotabod.com"
              target="_blank"
              rel="noreferrer"
            >
              Discord
            </a>{' '}
            for more help.
          </span>
        ),
      })
    }
  }, [router.asPath, status])

  if (status === 'authenticated') return null

  return (
    <Container>
      <div className="flex flex-col justify-center mx-auto w-full max-w-2xl px-4 sm:px-6 h-full">
        <div className="sm:mt-16">
          <h1 className="text-center text-2xl font-medium tracking-tight text-gray-200">
            Sign in
          </h1>
          <p className="mt-3 text-center text-lg text-gray-300">
            You can begin using Dotabod right away!
          </p>
        </div>
        <div className="-mx-4 mt-10 flex-auto bg-gray-700 px-4 shadow-2xl shadow-gray-900/10 sm:mx-0 sm:flex-none sm:rounded-5xl sm:p-24">
          <UserAuthForm />
        </div>
      </div>
    </Container>
  )
}

Login.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell title="Sign In | Dotabod">{page}</HomepageShell>
}

export default Login
