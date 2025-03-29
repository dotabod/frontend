import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect, useState } from 'react'
import { Button, Typography, Alert, Card, Spin, App } from 'antd'
import { captureException } from '@sentry/nextjs'
import { useTrack } from '@/lib/track'

const { Title, Paragraph, Text } = Typography

const STEAM_OPEN_ID_URL = 'https://steamcommunity.com/openid/login'

const VerifyPage: NextPageWithLayout = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [steamId, setSteamId] = useState<string | null>(null)
  const [steamProfile, setSteamProfile] = useState<{
    avatar?: string
    name?: string
    id?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const { notification } = App.useApp()
  const track = useTrack()

  // Step 1: Authenticate with Twitch if not already authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('twitch', {
        redirect: false,
        callbackUrl: '/verify',
      }).catch((e) => {
        captureException(e)
        console.error(e)
      })
    }
  }, [status])

  // Step 3: Check for Steam authentication callback
  useEffect(() => {
    const handleSteamCallback = async () => {
      if (router.query.openid_ns && status === 'authenticated') {
        setLoading(true)
        try {
          // Send all OpenID response parameters to our server to verify
          const openIdParams = { ...router.query }

          // Verify the Steam authentication server-side
          const response = await fetch('/api/steam/validate-auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(openIdParams),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Steam authentication validation failed')
          }

          const { steam32Id, profileData } = await response.json()

          if (steam32Id) {
            setSteamId(steam32Id)
            setSteamProfile(profileData)

            // Show success notification
            notification.success({
              message: 'Steam Account Verified',
              description:
                'Your Steam account has been successfully verified and linked to your profile.',
            })

            // Track successful verification
            track('steam_verification_success', { steam32Id })

            // Clear query parameters from URL
            router.replace('/verify', undefined, { shallow: true })
          } else {
            throw new Error('Invalid Steam authentication response')
          }
        } catch (error) {
          captureException(error)
          console.error('Error processing Steam authentication:', error)
          notification.error({
            message: 'Steam Verification Failed',
            description: 'There was an error verifying your Steam account. Please try again.',
          })
          track('steam_verification_error')
        } finally {
          setLoading(false)
        }
      }
    }

    handleSteamCallback()
  }, [router.query, status, router, notification, track])

  // Step 2: Redirect to Steam authentication
  const handleSteamLogin = () => {
    setLoading(true)

    // Track attempt to authenticate with Steam
    track('steam_auth_started')

    // Build Steam OpenID parameters
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': `${window.location.origin}/verify`,
      'openid.realm': window.location.origin,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    })

    // Redirect to Steam authentication
    window.location.href = `${STEAM_OPEN_ID_URL}?${params.toString()}`
  }

  // Handle loading state while authenticating with Twitch
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <Container>
        <div className='flex flex-col items-center justify-center min-h-[60vh]'>
          <Spin size='large' />
          <Paragraph className='mt-4'>Connecting to Twitch...</Paragraph>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className='flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto p-4 md:p-8'>
        <Title level={2} className='mb-6'>
          Account Verification
        </Title>

        {/* Step 1: Twitch Authentication Status */}
        <Card className='w-full mb-6 shadow-sm hover:shadow-md transition-shadow'>
          <div className='flex items-center mb-2'>
            <div className='mr-2 flex-shrink-0'>
              {status === 'authenticated' ? (
                <span className='text-green-500 text-2xl'>✓</span>
              ) : (
                <span className='text-gray-500 text-2xl'>○</span>
              )}
            </div>
            <Title level={4} className='m-0'>
              Twitch Authentication
            </Title>
          </div>

          {status === 'authenticated' ? (
            <Alert
              type='success'
              message={`Successfully authenticated as ${session?.user?.name}`}
              className='mb-2'
            />
          ) : (
            <Alert
              type='info'
              message='Please authenticate with Twitch to continue.'
              className='mb-2'
            />
          )}
        </Card>

        {/* Step 2: Steam Authentication */}
        <Card className='w-full shadow-sm hover:shadow-md transition-shadow'>
          <div className='flex items-center mb-2'>
            <div className='mr-2 flex-shrink-0'>
              {steamId ? (
                <span className='text-green-500 text-2xl'>✓</span>
              ) : (
                <span className='text-gray-500 text-2xl'>○</span>
              )}
            </div>
            <Title level={4} className='m-0'>
              Steam Authentication
            </Title>
          </div>

          {steamId ? (
            <div>
              <Alert type='success' message='Successfully linked Steam account' className='mb-2' />

              {steamProfile && (
                <div className='flex items-center mt-4'>
                  {steamProfile.avatar && (
                    <img
                      src={steamProfile.avatar}
                      alt='Steam Avatar'
                      className='w-12 h-12 rounded-sm mr-3'
                    />
                  )}
                  <div>
                    <Text strong>Steam Profile: {steamProfile.name}</Text>
                    <br />
                    <Text>Steam32 ID: {steamId}</Text>
                  </div>
                </div>
              )}

              <div className='mt-6 flex justify-center'>
                <Button
                  type='primary'
                  size='large'
                  onClick={() => router.push('/dashboard')}
                  className='px-8'
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Alert
                type='info'
                message='Link your Steam account to complete verification.'
                className='mb-2'
              />

              <Button
                type='primary'
                size='large'
                onClick={handleSteamLogin}
                loading={loading}
                disabled={status !== 'authenticated'}
                className='mt-4 px-8 w-full md:w-auto'
              >
                Authenticate with Steam
              </Button>
            </div>
          )}
        </Card>
      </div>
    </Container>
  )
}

VerifyPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      seo={{
        title: 'Verify Account | Dotabod',
        description: 'Verify your Twitch and Steam accounts to use Dotabod.',
        canonicalUrl: 'https://dotabod.com/verify',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default VerifyPage
