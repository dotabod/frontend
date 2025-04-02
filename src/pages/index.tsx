import { Faqs } from '@/components/Homepage/Faqs'
import { Hero } from '@/components/Homepage/Hero'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { PrimaryFeatures } from '@/components/Homepage/PrimaryFeatures'
import { SecondaryFeatures } from '@/components/Homepage/SecondaryFeatures'
import { Pricing } from '@/components/Pricing'
import type { NextPageWithLayout } from '@/pages/_app'
import type { ReactElement } from 'react'

const Index: NextPageWithLayout = () => (
  <>
    <Hero />
    <PrimaryFeatures />
    <SecondaryFeatures />
    <Pricing />
    <Faqs />
  </>
)

Index.getLayout = function getLayout(page: ReactElement) {
  // Generate dynamic OG image URL
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://dotabod.com'

  const ogImageUrl = new URL('/api/og-image', baseUrl)
  ogImageUrl.searchParams.set('title', 'Dotabod - Enhance Your Dota 2 Streaming Experience')
  ogImageUrl.searchParams.set(
    'subtitle',
    'Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!',
  )

  // Use the dynamically generated OG image or fall back to the one specified in frontmatter
  const finalOgImage = ogImageUrl.toString()

  return (
    <HomepageShell
      seo={{
        title: 'Dotabod - Enhance Your Dota 2 Streaming Experience',
        description:
          'Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!',
        canonicalUrl: 'https://dotabod.com',
        ogImage: finalOgImage,
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default Index
