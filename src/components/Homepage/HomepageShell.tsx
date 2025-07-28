import Head from 'next/head'
import type { ReactNode } from 'react'
import Banner from '@/components/Banner'
import CookieConsent from '@/components/CookieConsent'
import { Footer } from '@/components/Homepage/Footer'
import { Header } from '@/components/Homepage/Header'
import useMaybeSignout from '@/lib/hooks/useMaybeSignout'
import HubSpotIdentification from '../HubSpotIdentification'
import HubSpotScript from '../HubSpotScript'

interface SEOProps {
  title?: string
  description?: string
  ogImage?: string
  canonicalUrl?: string
  ogType?: string
  noindex?: boolean
}

interface OGImageProps {
  title?: string
  subtitle?: string
}

const HomepageShell = ({
  title,
  dontUseTitle,
  children,
  seo,
  username,
  ogImage,
}: {
  dontUseTitle?: boolean
  title?: ReactNode
  children?: ReactNode
  seo?: SEOProps
  username?: string
  ogImage?: OGImageProps
}) => {
  useMaybeSignout()

  const defaultTitle = 'Dotabod - Enhance Your Dota 2 Streaming Experience'
  const defaultDescription =
    'Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!'
  // Generate dynamic OG image URL using parameters
  let defaultOgImage = '/images/welcome.png'
  const host = typeof window !== 'undefined' ? window.location.origin : ''

  // If ogImage props are provided, build a custom OG image URL
  if (ogImage) {
    const params = new URLSearchParams()
    if (ogImage.title) params.append('title', ogImage.title)
    if (ogImage.subtitle) params.append('subtitle', ogImage.subtitle)

    // Ensure the URL has the full origin for absolute URLs
    defaultOgImage = `${host}/api/og-image?${params.toString()}`
  }
  // For backward compatibility - if only username is provided
  else if (username) {
    defaultOgImage = `${host}/api/og-image?title=${encodeURIComponent(username)}&subtitle=Commands, MMR Tracking, Live Stats, and more!`
  }

  const defaultUrl = !process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? host
    : `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`

  // Use SEO props if provided, otherwise use defaults
  const pageTitle = seo?.title || (title as string) || defaultTitle
  const pageDescription = seo?.description || defaultDescription
  const pageImage = seo?.ogImage || defaultOgImage
  // Ensure pageImage is an absolute URL
  const absolutePageImage = pageImage.startsWith('http') ? pageImage : `${host}${pageImage}`
  const pageUrl = seo?.canonicalUrl || defaultUrl
  const pageType = seo?.ogType || 'website'

  return (
    <>
      <Head>
        {!dontUseTitle && <title>{pageTitle}</title>}
        <meta name='title' content={pageTitle} />
        <meta name='description' content={pageDescription} />
        <meta
          name='keywords'
          content='Dotabod Twitch Bot, Dota 2 Streaming Tools, Dota 2 Chat Commands, Dotabod MMR Tracking, Twitch Bot for Dota 2, Live Dota 2 Stats, Interactive Dota 2 Stream, Dota 2 Game Analytics, Dotabod Pro Builds, Dota 2 Stream Enhancements, Twitch bets, Automatic'
        />
        <meta property='og:type' content={pageType} />
        <meta property='og:url' content={pageUrl} />
        <meta property='og:title' content={pageTitle} />
        <meta property='og:description' content={pageDescription} />
        <meta property='og:image' content={absolutePageImage} />

        <meta property='twitter:card' content='summary_large_image' />
        <meta property='twitter:url' content={pageUrl} />
        <meta property='twitter:title' content={pageTitle} />
        <meta property='twitter:description' content={pageDescription} />
        <meta property='twitter:image' content={absolutePageImage} />

        {seo?.noindex && <meta name='robots' content='noindex, nofollow' />}

        {seo?.canonicalUrl && <link rel='canonical' href={seo.canonicalUrl} />}
        <style global jsx>{`
          html,#__next,body {
            background-color: #1f2937; /* bg-gray-800 */
          }
        `}</style>
      </Head>

      <Banner />
      <Header />
      <HubSpotScript />
      <HubSpotIdentification />
      <main
        className='bg-gray-800'
        style={{
          minHeight: 'calc(100vh - 379px)',
        }}
      >
        {children}
      </main>
      <Footer />
      <CookieConsent />
    </>
  )
}

export default HomepageShell
