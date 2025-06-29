import { useRouter } from 'next/router'
import { type ReactElement, useEffect } from 'react'
import { GiftSubscriptionForm } from '@/components/Gift/GiftSubscriptionForm'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import { createGiftLink } from '@/utils/gift-links'

const GiftSubscriptionPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { canceled } = router.query

  // Check if username is provided in the query
  useEffect(() => {
    const { username } = router.query
    if (username && typeof username === 'string' && router.pathname === '/gift') {
      router.push(createGiftLink(username))
    }
  }, [router])

  return <GiftSubscriptionForm canceled={canceled === 'true'} />
}

GiftSubscriptionPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        title: 'Gift Dotabod Pro',
        subtitle: 'Gift Dotabod Pro to your favorite streamer',
      }}
      seo={{
        title: 'Gift Dotabod Pro',
        description: 'Gift Dotabod Pro to your favorite streamer',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default GiftSubscriptionPage
