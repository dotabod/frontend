import Head from 'next/head'

import { AuthLayout } from '@/components/Homepage/AuthLayout'
import { UserAuthForm } from '@/components/Homepage/AuthForm'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

export default function Login() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      void router.push('/dashboard')
    }
  }, [router, status])

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
