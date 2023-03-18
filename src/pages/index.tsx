import Head from 'next/head'
import type { NextPage, NextPageContext } from 'next'

import { Faqs } from '@/components/Homepage/Faqs'
import { Footer } from '@/components/Homepage/Footer'
import { Header } from '@/components/Homepage/Header'
import { Hero } from '@/components/Homepage/Hero'
import { Pricing } from '@/components/Homepage/Pricing'
import { PrimaryFeatures } from '@/components/Homepage/PrimaryFeatures'
import { SecondaryFeatures } from '@/components/Homepage/SecondaryFeatures'

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Dotabod - Enhance Your Dota 2 Streaming Experience</title>
        <meta
          name="title"
          content="Dotabod - Enhance Your Dota 2 Streaming Experience"
        />
        <meta
          name="description"
          content="Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!"
        />
        <meta
          name="keywords"
          content="Dotabod Twitch Bot, Dota 2 Streaming Tools, Dota 2 Chat Commands, Dotabod MMR Tracking, Twitch Bot for Dota 2, Live Dota 2 Stats, Interactive Dota 2 Stream, Dota 2 Game Analytics, Dotabod Pro Builds, Dota 2 Stream Enhancements, Twitch bets, Automatic"
        />
        {/* <!-- Open Graph / Facebook --> */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://dotabod.com/" />
        <meta
          property="og:title"
          content="Dotabod - Enhance Your Dota 2 Streaming Experience"
        />
        <meta
          property="og:description"
          content="Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!"
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
          content="Dotabod - Enhance Your Dota 2 Streaming Experience"
        />
        <meta
          property="twitter:description"
          content="Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!"
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

export default Home

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export async function getStaticProps({ locale }: NextPageContext) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  }
}
