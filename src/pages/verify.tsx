import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect, useState } from 'react'
import {
  Button,
  Typography,
  Alert,
  Spin,
  App,
  Divider,
  Tag,
  List,
  Avatar,
  Space,
  Modal,
} from 'antd'
import { captureException } from '@sentry/nextjs'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import { getRankTitle } from '@/lib/ranks'
import Link from 'next/link'
import { StarOutlined, StarFilled, DeleteOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

const STEAM_OPEN_ID_URL = 'https://steamcommunity.com/openid/login'

interface OpenDotaProfile {
  profile: {
    account_id: number
    personaname: string
    name: string | null
    plus: boolean
    cheese: number
    steamid: string
    avatar: string
    avatarmedium: string
    avatarfull: string
    profileurl: string
    last_login: string
    loccountrycode: string
    status: string | null
    fh_unavailable: boolean
    is_contributor: boolean
    is_subscriber: boolean
  }
  rank_tier: number
  leaderboard_rank: number | null
}

interface LinkedAccount {
  steam32Id: string
  name: string | null
  isPrimary: boolean
  profile?: OpenDotaProfile | null
  loading?: boolean
}

/**
 * Update player profile in our database and fetch OpenDota data from our backend
 */
async function updatePlayerProfile(steam32Id: string | number): Promise<OpenDotaProfile | null> {
  try {
    const response = await fetch('/api/steam/update-profile-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ steam32Id }),
    })

    if (!response.ok) {
      throw new Error('Failed to update profile data')
    }

    const data = await response.json()
    return data.profile as OpenDotaProfile
  } catch (error) {
    console.error('Error updating profile data:', error)
    return null
  }
}

const VerifyPage: NextPageWithLayout = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingAccount, setCheckingAccount] = useState(false)
  const [accountToUnlink, setAccountToUnlink] = useState<string | null>(null)
  const [unlinkModalVisible, setUnlinkModalVisible] = useState(false)
  const { notification, modal } = App.useApp()
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

  // Check for linked Steam accounts on page load
  useEffect(() => {
    const checkLinkedAccounts = async () => {
      if (status === 'authenticated' && !router.query['openid.ns']) {
        setCheckingAccount(true)
        try {
          const response = await fetch('/api/steam/get-linked-account')

          if (response.ok) {
            const data = await response.json()

            if (data.linked) {
              setLinkedAccounts(
                data.accounts.map((account: LinkedAccount) => ({
                  ...account,
                  loading: false,
                  profile: null,
                })),
              )

              // Fetch player profiles for all accounts
              for (const account of data.accounts) {
                fetchPlayerProfile(Number.parseInt(account.steam32Id, 10))
              }
            }
          }
        } catch (error) {
          console.error('Error checking linked Steam accounts:', error)
        } finally {
          setCheckingAccount(false)
        }
      }
    }

    checkLinkedAccounts()
  }, [status, router.query])

  // Step 3: Check for Steam authentication callback
  useEffect(() => {
    const handleSteamCallback = async () => {
      if (router.query['openid.ns'] && status === 'authenticated') {
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
            // Show success notification
            notification.success({
              message: 'Steam Account Verified',
              description:
                'Your Steam account has been successfully verified and linked to your profile.',
            })

            // Track successful verification
            track('steam_verification_success', { steam32Id })

            // Refresh the list of linked accounts
            const accountsResponse = await fetch('/api/steam/get-linked-account')
            if (accountsResponse.ok) {
              const data = await accountsResponse.json()

              if (data.linked) {
                setLinkedAccounts(
                  data.accounts.map((account: LinkedAccount) => ({
                    ...account,
                    loading: false,
                    profile: null,
                  })),
                )

                // Fetch player profiles for all accounts
                for (const account of data.accounts) {
                  fetchPlayerProfile(Number.parseInt(account.steam32Id, 10))
                }
              }
            }

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
          router.replace('/verify', undefined, { shallow: true })
        } finally {
          setLoading(false)
        }
      }
    }

    handleSteamCallback()
  }, [router.query, status, router, notification, track])

  // Fetch player profile from OpenDota API through our backend
  const fetchPlayerProfile = async (accountId: number) => {
    if (!accountId) return

    // Update loading state for this account
    setLinkedAccounts((prevAccounts) =>
      prevAccounts.map((account) =>
        account.steam32Id === accountId.toString() ? { ...account, loading: true } : account,
      ),
    )

    try {
      // Use our backend API to fetch and save profile data in one call
      const profile = await updatePlayerProfile(accountId)

      // Update account with profile data
      setLinkedAccounts((prevAccounts) =>
        prevAccounts.map((account) =>
          account.steam32Id === accountId.toString()
            ? { ...account, profile, loading: false }
            : account,
        ),
      )

      if (profile) {
        track('player_profile_fetched', {
          rank_tier: profile.rank_tier,
          has_leaderboard_rank: !!profile.leaderboard_rank,
        })
      }
    } catch (error) {
      console.error('Error fetching player profile:', error)

      // Update loading state to false
      setLinkedAccounts((prevAccounts) =>
        prevAccounts.map((account) =>
          account.steam32Id === accountId.toString() ? { ...account, loading: false } : account,
        ),
      )

      notification.warning({
        message: 'Profile Data Incomplete',
        description:
          "We couldn't retrieve complete Dota 2 profile data for one of your accounts. Some information may be missing.",
      })
    }
  }

  // Set an account as primary
  const setPrimaryAccount = async (steam32Id: string) => {
    try {
      const response = await fetch('/api/steam/set-primary-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steam32Id }),
      })

      if (!response.ok) {
        throw new Error('Failed to set primary account')
      }

      // Update the accounts list to reflect the new primary
      setLinkedAccounts((prevAccounts) =>
        prevAccounts.map((account) => ({
          ...account,
          isPrimary: account.steam32Id === steam32Id,
        })),
      )

      notification.success({
        message: 'Primary Account Updated',
        description: 'Your primary Steam account has been updated successfully.',
      })
    } catch (error) {
      console.error('Error setting primary account:', error)
      notification.error({
        message: 'Update Failed',
        description: 'Failed to update your primary Steam account. Please try again.',
      })
    }
  }

  // Show unlink confirmation modal
  const showUnlinkConfirmation = (steam32Id: string) => {
    const account = linkedAccounts.find((a) => a.steam32Id === steam32Id)
    if (!account) return

    setAccountToUnlink(steam32Id)
    setUnlinkModalVisible(true)
  }

  // Handle unlink confirmation
  const handleUnlinkConfirm = async () => {
    if (!accountToUnlink) return

    try {
      await unlinkAccount(accountToUnlink)
      setUnlinkModalVisible(false)
      setAccountToUnlink(null)
    } catch (error) {
      console.error('Error in unlink confirmation:', error)
    }
  }

  // Unlink a Steam account
  const unlinkAccount = async (steam32Id: string) => {
    try {
      const response = await fetch('/api/steam/unlink-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steam32Id }),
      })

      if (!response.ok) {
        throw new Error('Failed to unlink account')
      }

      // Remove the account from the list
      setLinkedAccounts((prevAccounts) =>
        prevAccounts.filter((account) => account.steam32Id !== steam32Id),
      )

      notification.success({
        message: 'Account Unlinked',
        description: 'Your Steam account has been successfully unlinked.',
      })
    } catch (error) {
      console.error('Error unlinking account:', error)
      notification.error({
        message: 'Unlink Failed',
        description: 'Failed to unlink your Steam account. Please try again.',
      })
    }
  }

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

  // Format rank title with leaderboard rank if available
  const formatRankTitle = (rankTier: number, leaderboardRank: number | null) => {
    const baseRankTitle = getRankTitle(rankTier)
    return leaderboardRank ? `${baseRankTitle} #${leaderboardRank}` : baseRankTitle
  }

  // Get rank image URL
  const getRankImageUrl = (rankTier: number) => {
    if (!rankTier) return '/images/ranks/0.png'

    // Extract the medal and stars from rank tier
    const medal = Math.floor(rankTier / 10)
    const stars = rankTier % 10

    // If it's Immortal rank
    if (medal >= 8) {
      return '/images/ranks/80.png'
    }

    return `/images/ranks/${medal}${stars}.png`
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

  // Handle loading state while checking for linked account
  if (checkingAccount) {
    return (
      <Container>
        <div className='flex flex-col items-center justify-center min-h-[60vh]'>
          <Spin size='large' />
          <Paragraph className='mt-4'>Checking for linked accounts...</Paragraph>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className='flex flex-col items-center justify-center min-h-[60vh]'>
        <Title level={2} className='mb-6'>
          Account Verification
        </Title>

        {/* Step 1: Twitch Authentication Status */}
        <Card className='w-full mb-6'>
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
              {linkedAccounts.length > 0 ? (
                <span className='text-green-500 text-2xl'>✓</span>
              ) : (
                <span className='text-gray-500 text-2xl'>○</span>
              )}
            </div>
            <Title level={4} className='m-0'>
              Steam Authentication
            </Title>
          </div>

          {linkedAccounts.length > 0 ? (
            <div>
              <Alert
                type='success'
                message={`Successfully linked ${linkedAccounts.length > 1 ? `${linkedAccounts.length} Steam accounts` : 'Steam account'}`}
                className='mb-4'
              />

              <Divider orientation='left'>Linked Accounts</Divider>

              <List
                className='max-w-3xl'
                itemLayout='horizontal'
                dataSource={linkedAccounts}
                renderItem={(account) => (
                  <List.Item
                    key={account.steam32Id}
                    actions={[
                      !account.isPrimary && (
                        <Button
                          key='set-primary'
                          type='text'
                          icon={<StarOutlined />}
                          onClick={() => setPrimaryAccount(account.steam32Id)}
                          title='Set as primary account'
                        >
                          Set as Primary
                        </Button>
                      ),
                      <Button
                        key='unlink'
                        type='text'
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => showUnlinkConfirmation(account.steam32Id)}
                        title='Unlink this account'
                      >
                        Unlink
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className='flex items-center'>
                          {account.isPrimary && (
                            <StarFilled style={{ color: 'gold', marginRight: '8px' }} />
                          )}
                          <Avatar src={account.profile?.profile.avatar} size='large' />
                        </div>
                      }
                      title={
                        <div className='flex items-center gap-2'>
                          <Text strong>
                            {account.name ||
                              account.profile?.profile.personaname ||
                              'Unknown Player'}
                          </Text>
                          {account.isPrimary && (
                            <Tag color='gold' className='ml-2'>
                              Primary
                            </Tag>
                          )}
                        </div>
                      }
                      description={`Steam32 ID: ${account.steam32Id}`}
                    />

                    {account.loading ? (
                      <Spin size='small' />
                    ) : account.profile && account.profile.rank_tier > 0 ? (
                      <Space align='center'>
                        <img
                          src={getRankImageUrl(account.profile.rank_tier)}
                          alt='Rank Medal'
                          className='w-12 h-12'
                        />
                        <div className='flex flex-col gap-2'>
                          <Text strong>
                            {formatRankTitle(
                              account.profile.rank_tier,
                              account.profile.leaderboard_rank,
                            )}
                          </Text>
                          {account.profile.leaderboard_rank && <Tag color='gold'>Leaderboard</Tag>}
                        </div>
                      </Space>
                    ) : (
                      <Text type='secondary'>Rank unavailable</Text>
                    )}
                  </List.Item>
                )}
              />

              <div className='mt-6 flex justify-between'>
                <Button
                  type='default'
                  size='large'
                  onClick={handleSteamLogin}
                  icon={<span className='mr-1'>+</span>}
                >
                  Link Another Account
                </Button>

                <Link href='/dashboard'>
                  <Button type='primary' size='large' className='px-8'>
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className='flex flex-col gap-4'>
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

        {/* Unlink Confirmation Modal */}
        <Modal
          title='Unlink Steam Account'
          open={unlinkModalVisible}
          onOk={handleUnlinkConfirm}
          onCancel={() => setUnlinkModalVisible(false)}
          okText='Unlink'
          cancelText='Cancel'
          okButtonProps={{ danger: true }}
        >
          <p>Are you sure you want to unlink this Steam account?</p>
          {accountToUnlink &&
            linkedAccounts.find((a) => a.steam32Id === accountToUnlink)?.isPrimary && (
              <Alert
                type='warning'
                message='This is your primary account'
                description='Unlinking your primary account will make another account primary if available.'
                className='mt-4'
              />
            )}
        </Modal>
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
