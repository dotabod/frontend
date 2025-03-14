import { GiftSubscriptionForm } from '@/components/Gift/GiftSubscriptionForm'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { useGetSettingsByUsername } from '@/lib/hooks/useUpdateSetting'
import type { NextPageWithLayout } from '@/pages/_app'
import { Skeleton } from 'antd'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect } from 'react'
import { Card } from '@/ui/card'

const GiftSubscriptionPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { username, canceled } = router.query
  const { data, loading, error, notFound } = useGetSettingsByUsername()

  // Redirect to 404 if user not found
  useEffect(() => {
    if (username && !loading && (notFound || data?.error || error)) {
      router.push('/404')
    }
  }, [data, loading, router, notFound, error, username])

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
        <title>{`Gift a subscription to ${!loading && data?.displayName ? data.displayName : username} - Dotabod`}</title>
        <meta
          name='description'
          content={`Support ${!loading && data?.displayName ? data.displayName : username} by gifting them Dotabod Pro!`}
        />
        {username && typeof username === 'string' && (
          <link rel='canonical' href={`https://dotabod.com/${username}/gift`} />
        )}
      </Head>
      <GiftSubscriptionForm
        recipientUsername={typeof username === 'string' ? username : undefined}
        recipientDisplayName={data?.displayName}
        canceled={canceled === 'true'}
        loading={loading}
      />
    </>
  )
}

GiftSubscriptionPage.getLayout = function getLayout(page: ReactElement) {
  const router = useRouter()
  const { username } = router.query

  return (
    <HomepageShell
      seo={{
        title: `Gift a subscription to ${username || 'streamers'} - Dotabod`,
        description: `Support ${username || 'streamers'} by gifting them Dotabod Pro!`,
        canonicalUrl: `https://dotabod.com/${username}/gift`,
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default GiftSubscriptionPage
