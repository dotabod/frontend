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
          'Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!',
        title: 'Enhance Your Dota 2 Streaming Experience',
      }}
      ogImage={{
        subtitle:
          'Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!',
        title: 'Enhance Your Dota 2 Streaming Experience',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default Index
