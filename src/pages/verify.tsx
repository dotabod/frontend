import { CheckCircleOutlined, DeleteOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { captureException } from '@sentry/nextjs'
import {
  Alert,
  App,
  Avatar,
  Button,
  Divider,
  List,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signIn, useSession } from 'next-auth/react'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import TwitchChat from '@/components/TwitchChat'
import { chatVerifyScopes } from '@/lib/authScopes'
import { getRankTitle } from '@/lib/ranks'
import { getMaintenanceRedirect } from '@/lib/server/maintenance'
import { useTrack } from '@/lib/track'
import type { NextPageWithLayout } from '@/pages/_app'
import { Card } from '@/ui/card'

const { Title, Text } = Typography

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
  const { notification } = App.useApp()
  const track = useTrack()
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleStreamerLogin = useCallback(() => {
    setIsSigningOut(true)
    signIn('twitch', { callbackUrl: '/dashboard', redirect: true })
  }, [])

  useEffect(() => {
    if (router.asPath.toLowerCase().includes('error=chatter')) {
      notification.error({
        key: 'chatter-error',
        duration: 0,
        message: 'Login error',
        description: (
          <span>
            You don't have access to the Streamer dashboard.{' '}
            <Button loading={isSigningOut} onClick={handleStreamerLogin}>
              Click here to login
            </Button>{' '}
            if you want to login as a streamer.
          </span>
        ),
      })
    }
  }, [router.asPath, isSigningOut, notification, handleStreamerLogin])

  // Step 1: Authenticate with Twitch if not already authenticated
  // We use minimal scopes needed for verification (user:read:email openid)
  // This is different from the scopes requested for streamers who need more permissions
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Pass specific scopes as a query parameter
      signIn(
        'twitch',
        {
          redirect: false,
          callbackUrl: '/verify',
        },
        {
          scope: chatVerifyScopes,
        },
      ).catch((e) => {
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

          const { steam32Id } = await response.json()

          if (steam32Id) {
            // Show success notification
            notification.success({
              message: 'Dotabod Verified!',
              description:
                'Your Steam account has been successfully verified and linked to your profile',
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
      // Set loading state for this specific action
      setActionLoading((prev) => ({ ...prev, [`setPrimary_${steam32Id}`]: true }))

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
    } finally {
      // Clear loading state
      setActionLoading((prev) => ({ ...prev, [`setPrimary_${steam32Id}`]: false }))
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
      // Set loading state for unlink modal buttons
      setActionLoading((prev) => ({ ...prev, unlinkModal: true }))
      await unlinkAccount(accountToUnlink)
      setUnlinkModalVisible(false)
      setAccountToUnlink(null)
    } catch (error) {
      console.error('Error in unlink confirmation:', error)
    } finally {
      setActionLoading((prev) => ({ ...prev, unlinkModal: false }))
    }
  }

  // Unlink a Steam account
  const unlinkAccount = async (steam32Id: string) => {
    try {
      // Set loading state for this specific action (if not already set by modal)
      if (!actionLoading.unlinkModal) {
        setActionLoading((prev) => ({ ...prev, [`unlink_${steam32Id}`]: true }))
      }

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

      // Check if we're unlinking a primary account and have other accounts left
      const unlinkingPrimary = linkedAccounts.find((a) => a.steam32Id === steam32Id)?.isPrimary
      const remainingAccounts = linkedAccounts.filter((account) => account.steam32Id !== steam32Id)

      if (unlinkingPrimary && remainingAccounts.length > 0) {
        // Set the first remaining account as the new primary
        const newPrimaryId = remainingAccounts[0].steam32Id

        // Update the accounts list to mark new primary
        setLinkedAccounts(
          remainingAccounts.map((account, index) => ({
            ...account,
            isPrimary: index === 0, // Make the first account primary
          })),
        )

        // Also update on the server
        await fetch('/api/steam/set-primary-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ steam32Id: newPrimaryId }),
        })
      } else {
        // Just remove the account from the list
        setLinkedAccounts(remainingAccounts)
      }

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
    } finally {
      // Clear loading state if not handled by modal
      if (!actionLoading.unlinkModal) {
        setActionLoading((prev) => ({ ...prev, [`unlink_${steam32Id}`]: false }))
      }
    }
  }

  // Step 2: Redirect to Steam authentication
  const handleSteamLogin = () => {
    setActionLoading((prev) => ({ ...prev, linkSteam: true }))

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
        <div className='flex flex-col min-h-[60vh]'>
          <Skeleton.Avatar active size={80} shape='circle' />
          <Skeleton.Input active style={{ width: 200, marginTop: 16 }} />
        </div>
      </Container>
    )
  }

  // Handle loading state while checking for linked account
  if (checkingAccount) {
    return (
      <Container>
        <div className='flex flex-col min-h-[60vh]'>
          <Title level={2} className='mb-6'>
            Get Dotabod Verified
          </Title>
          <Card className='w-full shadow-sm'>
            <Skeleton active avatar paragraph={{ rows: 4 }} />
          </Card>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className='flex flex-col min-h-[60vh]'>
        <Title level={2} className='mb-6'>
          Get Dotabod Verified
        </Title>

        {/* Step 1: Twitch Authentication Status */}
        {status !== 'authenticated' && (
          <Card className='w-full mb-6'>
            <div className='flex items-center mb-2'>
              <div className='mr-2 flex-shrink-0'>
                <span className='text-gray-500 text-2xl'>○</span>
              </div>
              <Title level={4} className='m-0'>
                Twitch Authentication
              </Title>
            </div>

            <Alert
              type='info'
              message='Please authenticate with Twitch to continue.'
              className='mb-2'
            />
          </Card>
        )}

        {linkedAccounts.length > 0 && (
          <Alert
            type='success'
            message="You're Dotabod Verified!"
            description='Your Steam account has been successfully linked to Dotabod.'
            showIcon
            className='mb-4!'
          />
        )}

        {/* Step 2: Steam Authentication */}
        <Card
          title='Steam Authentication'
          className='w-full shadow-sm hover:shadow-md transition-shadow'
        >
          <p>
            {linkedAccounts.length > 0
              ? 'You have successfully linked your Steam account to Dotabod. Now Dotabod will respond with your rank.'
              : 'Link your Steam account to become Dotabod Verified.'}
          </p>

          <TwitchChat
            command={`!rank ${session?.user?.name}`}
            responses={[
              linkedAccounts.length > 0
                ? `@${session?.user?.name} is ${getRankTitle(linkedAccounts?.[0]?.profile?.rank_tier)}`
                : `@${session?.user?.name}'s rank is unknown. Become Dotabod verified to get your rank!`,
            ]}
          />

          {linkedAccounts.length > 0 ? (
            <div>
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
                          loading={!!actionLoading[`setPrimary_${account.steam32Id}`]}
                          disabled={!!actionLoading[`setPrimary_${account.steam32Id}`]}
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
                        loading={!!actionLoading[`unlink_${account.steam32Id}`]}
                        disabled={!!actionLoading[`unlink_${account.steam32Id}`]}
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
                        <div className='flex items-center gap-2 flex-wrap'>
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
                          <Tag color='blue' icon={<CheckCircleOutlined />} className='ml-2'>
                            Verified
                          </Tag>
                        </div>
                      }
                      description={<>Steam ID: {account.steam32Id}</>}
                    />

                    {account.loading ? (
                      <Skeleton.Avatar active size={56} shape='circle' />
                    ) : account.profile && account.profile.rank_tier > 0 ? (
                      <Space align='center'>
                        {/* biome-ignore lint/performance/noImgElement: Dynamic rank image URL from external API */}
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
                      <Text type='secondary'>Uncalibrated</Text>
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
                  loading={loading || actionLoading.linkSteam}
                  disabled={loading || actionLoading.linkSteam}
                >
                  Link Another Account
                </Button>

                <Link href='/dashboard' prefetch={false}>
                  <Button type='primary' size='large' className='px-8'>
                    Go to Streamer's Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : loading ? (
            // Skeleton placeholder for loading state
            <div>
              <Divider orientation='left'>Linked Accounts</Divider>
              <List
                className='max-w-3xl'
                itemLayout='horizontal'
                dataSource={[1, 2]}
                renderItem={(item) => (
                  <List.Item
                    key={item}
                    actions={[
                      <Skeleton.Button key='action1' active style={{ width: 120 }} />,
                      <Skeleton.Button key='action2' active style={{ width: 80 }} />,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className='flex items-center'>
                          <Skeleton.Avatar active size='large' />
                        </div>
                      }
                      title={<Skeleton.Input active style={{ width: 200 }} />}
                      description={<Skeleton.Input active style={{ width: 120 }} />}
                    />
                    <Skeleton.Avatar active size={56} shape='circle' />
                  </List.Item>
                )}
              />
              <div className='mt-6 flex'>
                <Skeleton.Button active size='large' style={{ width: 200 }} />
              </div>
            </div>
          ) : (
            <div className='flex flex-col gap-4 mt-4'>
              {loading ? (
                <Skeleton.Button active size='large' style={{ width: '100%', height: 40 }} />
              ) : (
                <Button
                  type='primary'
                  size='large'
                  onClick={handleSteamLogin}
                  loading={loading || actionLoading.linkSteam}
                  disabled={loading || actionLoading.linkSteam}
                >
                  Authenticate with Steam
                </Button>
              )}
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
          okButtonProps={{
            danger: true,
            loading: actionLoading.unlinkModal,
            disabled: actionLoading.unlinkModal,
          }}
          cancelButtonProps={{
            disabled: actionLoading.unlinkModal,
          }}
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
        title: 'Get verified | Dotabod',
        description:
          'Verify your Twitch and Steam accounts to become Dotabod Verified and share your rank in chat!',
        canonicalUrl: 'https://dotabod.com/verify',
      }}
      ogImage={{
        title: 'Get Dotabod Verified',
        subtitle: 'Link your Steam account to become Dotabod Verified',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default VerifyPage

export const getServerSideProps: GetServerSideProps = async (ctx) => getMaintenanceRedirect(ctx)
