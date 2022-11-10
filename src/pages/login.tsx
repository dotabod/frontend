import Head from 'next/head'

import { AuthLayout } from '@/components/AuthLayout'
import { UserAuthForm } from '@/components/AuthForm'

export default function Login() {
  return (
    <>
      <Head>
        <title>Sign In - Dotabod</title>
      </Head>
      <AuthLayout title="Sign in to account">
        <UserAuthForm />
      </AuthLayout>
    </>
  )
}
