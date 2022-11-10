import Head from 'next/head'

import { Faqs } from '@/components/Faqs'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { Pricing } from '@/components/Pricing'
import { PrimaryFeatures } from '@/components/PrimaryFeatures'
import { SecondaryFeatures } from '@/components/SecondaryFeatures'

export default function Home() {
  return (
    <>
      <Head>
        <title>Dotabod - Tools for Dota 2 streamers.</title>
        <meta
          name="description"
          content="By leveraging insights from the Dota 2 official API, Dotabod will know exactly when to hide sensitive streamer information."
        />
      </Head>
      <Header />
      <main>
        <Hero />
        <PrimaryFeatures />
        <SecondaryFeatures />
        <Pricing />
        <Faqs />
      </main>
      <Footer />
    </>
  )
}
