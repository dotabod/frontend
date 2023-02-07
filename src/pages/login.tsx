import Head from 'next/head'

import { AuthLayout } from '@/components/Homepage/AuthLayout'
import { UserAuthForm } from '@/components/Homepage/AuthForm'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { showNotification } from '@mantine/notifications'
import Link from 'next/link'

export default function Login() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      void router.push('/dashboard')
    }
  }, [router, status])

  useEffect(() => {
    if (router.asPath.toLowerCase().includes('error')) {
      showNotification({
        id: 'login-error',
        title: 'Unable to log you in',
        disallowClose: true,
        autoClose: 50000,
        message: (
          <div>
            <Link
              href="https://discord.dotabod.com"
              target="_blank"
              className="text-blue-400 hover:text-blue-300"
            >
              Reach out to us on Discord
            </Link>{' '}
            to get help
          </div>
        ),
        color: 'red',
      })
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
