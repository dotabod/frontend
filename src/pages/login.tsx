import * as Sentry from '@sentry/nextjs'
import { App, Typography } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { type ReactElement, useCallback, useEffect } from 'react'
import { Container } from '@/components/Container'
import { UserAuthForm } from '@/components/Homepage/AuthForm'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'

const Login: NextPageWithLayout = () => {
  const { status } = useSession()
  App.useApp()
  const router = useRouter()
  const { notification } = App.useApp()

  const showError = useCallback(() => {
    Sentry.captureMessage('Login error', {
      tags: {
        page: 'login',
      },
    })

    notification.error({
      description: (
        <span>
          We couldn't log you in. First, try to login with{' '}
          <a
            href='https://support.google.com/chrome/answer/95464?hl=en&co=GENIE.Platform%3DDesktop'
            target='_blank'
            rel='noreferrer'
          >
            Incognito mode in Chrome
          </a>
          . If that doesn't work, maybe you already have an account on Dotabod with this email. Try
          to update your email on{' '}
          <a href='https://www.twitch.tv/settings/security' target='_blank' rel='noreferrer'>
            Twitch
          </a>{' '}
          to a new one and then try again. If you need more help, reach out to us through our{' '}
          <Link href='/contact'>contact page</Link>.
        </span>
      ),
      duration: 50_000,
      key: 'login-error',
      message: 'Login error',
    })
  }, [notification])

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
        description: (
          <span>
            You've been logged out. Please login again to relink your account to Twitch. Reach out
            to us through our <Link href='/contact'>contact page</Link> for more help.
          </span>
        ),
        duration: 50_000,
        key: 'scope-setup',
        message: 'Relink account',
      })
    }
  }, [router.asPath, status, notification, showError])

  if (status === 'authenticated') {
    return null
  }

  return (
    <Container>
      <div
        style={{ alignItems: 'center', display: 'flex', height: '100%', justifyContent: 'center' }}
      >
        <div style={{ maxWidth: '32rem', width: '100%' }}>
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <Typography.Title level={2}>Sign in</Typography.Title>
            <Typography.Paragraph style={{ color: 'var(--color-dark-300)', fontSize: '1.125rem' }}>
              You can begin using Dotabod right away!
            </Typography.Paragraph>
          </div>
          <div>
            <UserAuthForm />
            <Typography.Paragraph style={{ marginTop: '1rem', textAlign: 'center' }}>
              Not a streamer? If you just want to become Dotabod Verified to show your rank in chat,{' '}
              <Link href='/verify' prefetch={false}>
                login here
              </Link>
            </Typography.Paragraph>
          </div>
        </div>
      </div>
    </Container>
  )
}

Login.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        subtitle:
          'Sign in to your Dotabod account to access your dashboard and manage your Dota 2 streaming tools.',
        title: 'Sign In',
      }}
      seo={{
        canonicalUrl: 'https://dotabod.com/login',
        description:
          'Sign in to your Dotabod account to access your dashboard and manage your Dota 2 streaming tools.',
        title: 'Sign In | Dotabod',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default Login
