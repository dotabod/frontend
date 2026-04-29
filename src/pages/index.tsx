import type { ReactElement } from 'react'
import { ClosingCta } from '@/components/Homepage/ClosingCta'
import { Faqs } from '@/components/Homepage/Faqs'
import { Hero } from '@/components/Homepage/Hero'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { PrimaryFeatures } from '@/components/Homepage/PrimaryFeatures'
import { ProofStrip } from '@/components/Homepage/ProofStrip'
import { SecondaryFeatures } from '@/components/Homepage/SecondaryFeatures'
import { Pricing } from '@/components/Pricing'
import type { NextPageWithLayout } from '@/pages/_app'

const Index: NextPageWithLayout = () => (
  <>
    <Hero />
    <ProofStrip />
    <PrimaryFeatures />
    <SecondaryFeatures />
    <Pricing />
    <Faqs />
    <ClosingCta />
  </>
)

Index.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      seo={{
        title: 'Premium Dota 2 stream tools for creators',
        description:
          'Dotabod helps Dota 2 streamers automate predictions, protect ranked games, add premium overlays, and turn live match data into a better viewer experience.',
        canonicalUrl: 'https://dotabod.com',
      }}
      ogImage={{
        title: 'Premium Dota 2 stream tools for creators',
        subtitle:
          'Automate predictions, protect your ranked games, and give viewers a premium stream experience.',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default Index
