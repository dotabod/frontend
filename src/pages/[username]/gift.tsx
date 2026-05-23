import { Skeleton } from 'antd'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect } from 'react'
import { GiftSubscriptionForm } from '@/components/Gift/GiftSubscriptionForm'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { useGetSettingsByUsername } from '@/lib/hooks/useUpdateSetting'
import type { NextPageWithLayout } from '@/pages/_app'
import { Card } from '@/ui/card'

const GiftSubscriptionPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { username: rawUsername, canceled } = router.query
  const username = typeof rawUsername === 'string' ? rawUsername : ''
  const { data, loading, error, notFound } = useGetSettingsByUsername()
  const profile = data as { displayName?: string }

  // Redirect to 404 if user not found
  useEffect(() => {
    if (username && !loading && (notFound || error)) {
      void router.push('/404')
    }
  }, [loading, router, notFound, error, username])

  if (loading) {
    return (
      <div className='flex justify-center items-center'>
        <Card className='w-full max-w-2xl'>
          <Skeleton active avatar paragraph={{ rows: 4 }} />
          <div className='mt-8'>
            <Skeleton.Button active block size='large' />
          </div>
          <div className='mt-6'>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{`Gift a subscription to ${!loading && profile?.displayName ? profile.displayName : username} - Dotabod`}</title>
        <meta
          name='description'
          content={`Support ${!loading && profile?.displayName ? profile.displayName : username} by gifting them Dotabod Pro!`}
        />
        {username && <link rel='canonical' href={`https://dotabod.com/${username}/gift`} />}
      </Head>
      <GiftSubscriptionForm
        recipientUsername={username || undefined}
        recipientDisplayName={profile?.displayName}
        canceled={canceled === 'true'}
        loading={loading}
      />
    </>
  )
}

GiftSubscriptionPage.getLayout = function getLayout(page: ReactElement) {
  const router = useRouter()
  const { username: rawUsername } = router.query
  const username = typeof rawUsername === 'string' ? rawUsername : ''

  return (
    <HomepageShell
      seo={{
        canonicalUrl: `https://dotabod.com/${username}/gift`,
        description: `Support ${username || 'streamers'} by gifting them Dotabod Pro!`,
        title: `Gift a subscription to ${username || 'streamers'} - Dotabod`,
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default GiftSubscriptionPage
