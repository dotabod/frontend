import { Footer } from '@/components/Homepage/Footer'
import { Header } from '@/components/Homepage/Header'
import useMaybeSignout from '@/lib/hooks/useMaybeSignout'
import Head from 'next/head'
import type { ReactNode } from 'react'

const HomepageShell = ({
  title,
  dontUseTitle,
  children,
}: { dontUseTitle?: boolean; title?: ReactNode; children?: ReactNode }) => {
  useMaybeSignout()

  return (
    <>
      <Head>
        {dontUseTitle && (
          <title>
            {title ?? 'Dotabod - Enhance Your Dota 2 Streaming Experience'}
          </title>
        )}
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
        />
      </Head>
      <Header />
      <main
        className="bg-gray-800"
        style={{
          minHeight: 'calc(100vh - 397px)',
        }}
      >
        {children}
      </main>
      <Footer />
    </>
  )
}

export default HomepageShell
