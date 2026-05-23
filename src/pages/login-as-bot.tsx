import { Button, Typography } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signIn, useSession } from 'next-auth/react'
import { type ReactElement, useEffect, useState } from 'react'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { chatBotScopes } from '@/lib/authScopes'
import type { NextPageWithLayout } from '@/pages/_app'

const Login: NextPageWithLayout = () => {
  useSession()
  const router = useRouter()
  const [countdown, setCountdown] = useState(6)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          void router.push('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  const handleSignIn = () => {
    setIsLoading(true)
    void signIn(
      'twitch',
      { callbackUrl: '/dashboard' },
      {
        scope: chatBotScopes,
      },
    )
  }

  return (
    <Container>
      <div
        style={{ alignItems: 'center', display: 'flex', height: '100%', justifyContent: 'center' }}
      >
        <div style={{ maxWidth: '32rem', width: '100%' }}>
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <Typography.Title level={2}>Sign in as a chat bot</Typography.Title>
            <Typography.Paragraph style={{ color: 'var(--color-dark-300)', fontSize: '1.125rem' }}>
              You probably want to sign in as a streamer,{' '}
              <Link href='/login' prefetch={false}>
                <strong>login here</strong>
              </Link>
            </Typography.Paragraph>
            <Typography.Paragraph style={{ color: 'var(--color-dark-300)', fontSize: '1rem' }}>
              Redirecting to the streamer login page in {countdown} seconds...
            </Typography.Paragraph>
          </div>
          <div>
            Actually a chat bot?{' '}
            <Button loading={isLoading} onClick={handleSignIn}>
              login here
            </Button>
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
          'Sign in to your Dotabod chat bot account to access your dashboard and manage your Dota 2 streaming tools.',
        title: 'Sign In (chat bot)',
      }}
      seo={{
        canonicalUrl: 'https://dotabod.com/login-as-bot',
        description:
          'Sign in to your Dotabod chat bot account to access your dashboard and manage your Dota 2 streaming tools.',
        title: 'Sign In (chat bot) | Dotabod',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default Login
