import { Container } from '@/components/Container'
import { UserAuthForm } from '@/components/Homepage/AuthForm'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import * as Sentry from '@sentry/nextjs'
import { App, Typography } from 'antd'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect } from 'react'

const Login: NextPageWithLayout = () => {
  const { status } = useSession()
  const { message } = App.useApp()
  const router = useRouter()
  const { notification } = App.useApp()

  const showError = () => {
    Sentry.captureMessage('Login error', {
      tags: {
        page: 'login',
      },
    })

    notification.error({
      key: 'login-error',
      duration: 50000,
      message: 'Login error',
      description: (
        <span>
          We couldn't log you in. It looks like you already have an account on Dotabod with this
          email. Please update your email on{' '}
          <a href='https://www.twitch.tv/settings/security' target='_blank' rel='noreferrer'>
            Twitch
          </a>{' '}
          to a new one and try logging in again. If you need more help, reach out to us on{' '}
          <a href='https://help.dotabod.com' target='_blank' rel='noreferrer'>
            Discord
          </a>
          .
        </span>
      ),
    })
  }

  useEffect(() => {
    if (status === 'authenticated') {
      void router.push('/dashboard')
    }
  }, [router.push, status])

  useEffect(() => {
    if (status !== 'authenticated' && router.asPath.toLowerCase().includes('error')) {
      showError()
    } else if (status !== 'authenticated' && router.asPath.toLowerCase().includes('setup-scopes')) {
      notification.info({
        key: 'scope-setup',
        duration: 50000,
        message: 'Relink account',
        description: (
          <span>
            You've been logged out. Please login again to relink your account to Twitch. Reach out
            to us on{' '}
            <a href='https://help.dotabod.com' target='_blank' rel='noreferrer'>
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
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
      >
        <div style={{ width: '100%', maxWidth: '32rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Typography.Title level={2}>Sign in</Typography.Title>
            <Typography.Paragraph style={{ fontSize: '1.125rem', color: 'var(--color-dark-300)' }}>
              You can begin using Dotabod right away!
            </Typography.Paragraph>
          </div>
          <div>
            <UserAuthForm />
          </div>
        </div>
      </div>
    </Container>
  )
}

Login.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      seo={{
        title: 'Sign In | Dotabod',
        description:
          'Sign in to your Dotabod account to access your dashboard and manage your Dota 2 streaming tools.',
        canonicalUrl: 'https://dotabod.com/login',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default Login
