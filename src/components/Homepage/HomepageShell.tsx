import { Footer } from '@/components/Homepage/Footer'
import { Header } from '@/components/Homepage/Header'
import useMaybeSignout from '@/lib/hooks/useMaybeSignout'
import { useTrack } from '@/lib/track'
import { App, Button } from 'antd'
import Head from 'next/head'
import { type ReactNode, useEffect } from 'react'

const HomepageShell = ({
  title,
  dontUseTitle,
  children,
}: { dontUseTitle?: boolean; title?: ReactNode; children?: ReactNode }) => {
  useMaybeSignout()
  const track = useTrack()
  const { notification } = App.useApp()

  useEffect(() => {
    notification.open({
      key: 'important-update',
      type: 'error',
      duration: 0,
      placement: 'bottomLeft',
      message: 'Important Update for users who signed up after April 2024',
      description: (
        <div>
          <p>
            We recently experienced a database issue that impacted over 6,000
            users. If your Dotabod is not functioning correctly (incorrect
            win/loss calculations, overlay showing your stream as offline), you
            need to log in again and set up your account as if it's your first
            time.
          </p>
          <Button
            target="_blank"
            onClick={() => {
              track('important_update_read_more', { page: 'homepage' })
            }}
            href="https://x.com/dotabod_/status/1845898112054730842"
          >
            Read more
          </Button>
        </div>
      ),
    })
  }, [notification, track])

  return (
    <>
      <Head>
        {!dontUseTitle && (
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
          minHeight: 'calc(100vh - 379px)',
        }}
      >
        {children}
      </main>
      <Footer />
    </>
  )
}

export default HomepageShell
