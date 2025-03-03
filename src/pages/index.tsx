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
  return (
    <HomepageShell
      seo={{
        title: 'Dotabod - Enhance Your Dota 2 Streaming Experience',
        description:
          'Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!',
        canonicalUrl: 'https://dotabod.com',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default Index
