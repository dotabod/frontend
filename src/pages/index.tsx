import type { ReactElement } from 'react'

import { Faqs } from '@/components/Homepage/faqs'
import { Hero } from '@/components/Homepage/hero'
import HomepageShell from '@/components/Homepage/homepage-shell'
import { PrimaryFeatures } from '@/components/Homepage/primary-features'
import { SecondaryFeatures } from '@/components/Homepage/secondary-features'
import { Pricing } from '@/components/pricing'
import type { NextPageWithLayout } from '@/pages/_app'

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
  return (
    <HomepageShell
      seo={{
        canonicalUrl: 'https://dotabod.com',
        description:
          'Tools for Dota 2 streamers: Twitch predictions, anti-snipe overlays, chat commands, MMR tracking, and live stats.',
        title: 'Dotabod — Tools for Dota 2 streamers',
      }}
      ogImage={{
        subtitle:
          'Twitch predictions, anti-snipe overlays, chat commands, MMR tracking, and live stats.',
        title: 'Tools for Dota 2 streamers',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default Index
