'use client'

import { Container } from '@/components/Container'
import { createCheckoutSession, getPriceId } from '@/lib/stripe'
import { Button } from 'antd'
import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useState, type ReactElement, useEffect } from 'react'
import type { NextPageWithLayout } from '@/pages/_app'
import HomepageShell from '@/components/Homepage/HomepageShell'

const RegisterPage: NextPageWithLayout = () => {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const plan = searchParams?.get('plan') || 'starter'
  const period = searchParams?.get('period') || 'monthly'

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      if (!session) {
        await signIn('twitch', {
          callbackUrl: `/register?plan=${plan}&period=${period}`,
        })
        return
      }

      const priceId = getPriceId(
        plan as 'starter' | 'pro',
        period as 'monthly' | 'annual'
      )
      const response = await createCheckoutSession(priceId, session.user.id)

      if (!response.url) {
        throw new Error('Failed to create checkout session')
      }

      window.location.href = response.url
    } catch (error) {
      console.error('Subscription error:', error)
      message.error('Failed to start subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // If user is already logged in, redirect to checkout immediately
  useEffect(() => {
    if (session && plan && period) {
      handleSubscribe()
    }
  }, [session, plan, period, handleSubscribe])

  // Show loading state if we're about to redirect
  if (session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-20">
        <Container>
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-3xl font-bold text-white">
              Redirecting to checkout...
            </h1>
            <div className="mt-8">
              <Button loading size="large" className="bg-purple-600">
                Please wait
              </Button>
            </div>
          </div>
        </Container>
      </div>
    )
  }

  // Show login UI if not logged in
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-20">
      <Container>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-3xl font-bold text-white">
            {session ? 'Complete Your Subscription' : 'Connect with Twitch'}
          </h1>

          <div className="mt-8 space-y-4">
            {!session ? (
              <div className="space-y-4">
                <p className="text-gray-400">
                  To get started with Dotabod, connect your Twitch account
                  first.
                </p>
                <Button
                  size="large"
                  type="primary"
                  className="bg-purple-600 hover:bg-purple-500"
                  onClick={() => handleSubscribe()}
                  loading={isLoading}
                >
                  <div className="flex items-center gap-2">
                    <Image
                      src="/twitch.svg"
                      alt="Twitch"
                      width={24}
                      height={24}
                    />
                    Connect with Twitch
                  </div>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-800/50 p-4">
                  <p className="text-gray-300">Logged in as:</p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Image
                      src={session.user.image || '/default-avatar.png'}
                      alt={session.user.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <span className="text-white">{session.user.name}</span>
                  </div>
                </div>
                <Button
                  size="large"
                  type="primary"
                  className="bg-purple-600 hover:bg-purple-500"
                  onClick={() => handleSubscribe()}
                  loading={isLoading}
                >
                  Continue to Checkout
                </Button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}

RegisterPage.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell>{page}</HomepageShell>
}

export default RegisterPage
