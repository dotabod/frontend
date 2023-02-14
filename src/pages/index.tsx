import Head from 'next/head'

import { Faqs } from '@/components/Homepage/Faqs'
import { Footer } from '@/components/Homepage/Footer'
import { Header } from '@/components/Homepage/Header'
import { Hero } from '@/components/Homepage/Hero'
import { Pricing } from '@/components/Homepage/Pricing'
import { PrimaryFeatures } from '@/components/Homepage/PrimaryFeatures'
import { SecondaryFeatures } from '@/components/Homepage/SecondaryFeatures'

export default function Home() {
  return (
    <>
      <Head>
        <title>Dotabod - Tools for Dota 2 streamers.</title>
        <meta name="title" content="Dotabod - Tools for Dota 2 streamers." />
        <meta
          name="description"
          content="For Dota 2 Streamers. Automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, mmr tracking, and more for your stream!"
        />
        <meta
          name="keywords"
          content="Dota 2, assistant app, MMR tracker, Twitch predictions, minimap blocker, hero picks blocker, roshan timer, OBS scene switcher, twitch chat generator"
        />
        {/* <!-- Open Graph / Facebook --> */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://dotabod.com/" />
        <meta
          property="og:title"
          content="Dotabod - Tools for Dota 2 streamers."
        />
        <meta
          property="og:description"
          content="For Dota 2 Streamers. Automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, mmr tracking, and more for your stream!"
        />
        <meta
          property="og:image"
          content="https://dotabod.com/images/welcome.png"
        />

        {/* <!-- Twitter --> */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://dotabod.com/" />
        <meta
          property="twitter:title"
          content="Dotabod - Tools for Dota 2 streamers."
        />
        <meta
          property="twitter:description"
          content="For Dota 2 Streamers. Automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, mmr tracking, and more for your stream!"
        />
        <meta
          property="twitter:image"
          content="https://dotabod.com/images/welcome.png"
        ></meta>
      </Head>
      <Header />
      <main className="bg-gray-800">
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
