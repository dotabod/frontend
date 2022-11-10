import Head from 'next/head'

import { AuthLayout } from '@/components/AuthLayout'
import { UserAuthForm } from '@/components/AuthForm'

export default function Login() {
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
