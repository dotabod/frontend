import Head from 'next/head'

import { AuthLayout } from '@/components/Homepage/AuthLayout'
import { UserAuthForm } from '@/components/Homepage/AuthForm'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { App, Typography } from 'antd'

export default function Login() {
  const { status } = useSession()
  const { message } = App.useApp()
  const router = useRouter()

  const showError = () => {
    message.error({
      key: 'login-error',
      duration: 50000,
      content: (
        <span>
          Oops. Unable to log you in. Reach out to us on{' '}
          <Typography.Link href="https://discord.dotabod.com" target="_blank">
            Discord
          </Typography.Link>{' '}
          to get help.
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
    if (router.asPath.toLowerCase().includes('error')) {
      showError()
    }
  }, [router.asPath])

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
        <UserAuthForm />
      </AuthLayout>
    </>
  )
}
