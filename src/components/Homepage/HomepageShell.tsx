import Banner from '@/components/Banner'
import { Footer } from '@/components/Homepage/Footer'
import { Header } from '@/components/Homepage/Header'
import useMaybeSignout from '@/lib/hooks/useMaybeSignout'
import Head from 'next/head'
import type { ReactNode } from 'react'
import HubSpotIdentification from '../HubSpotIdentification'
import HubSpotScript from '../HubSpotScript'

interface SEOProps {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  ogType?: string;
}

const HomepageShell = ({
  title,
  dontUseTitle,
  children,
  seo,
}: {
  dontUseTitle?: boolean;
  title?: ReactNode;
  children?: ReactNode;
  seo?: SEOProps;
}) => {
  useMaybeSignout()

  const defaultTitle = 'Dotabod - Enhance Your Dota 2 Streaming Experience';
  const defaultDescription = 'Dotabod provides Dota 2 streamers with a suite of tools, including automatic Twitch predictions, minimap & hero blocker, OBS scene switcher, chat commands, MMR tracking, live stats, and more to elevate your streaming experience!';
  const defaultOgImage = `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/images/welcome.png`;
  const defaultUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;

  // Use SEO props if provided, otherwise use defaults
  const pageTitle = seo?.title || (title as string) || defaultTitle;
  const pageDescription = seo?.description || defaultDescription;
  const pageImage = seo?.ogImage || defaultOgImage;
  const pageUrl = seo?.canonicalUrl || defaultUrl;
  const pageType = seo?.ogType || 'website';

  return (
    <>
      <Head>
        {!dontUseTitle && (
          <title>{pageTitle}</title>
        )}
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
        <meta property='og:image' content={pageImage} />

        <meta property='twitter:card' content='summary_large_image' />
        <meta property='twitter:url' content={pageUrl} />
        <meta property='twitter:title' content={pageTitle} />
        <meta property='twitter:description' content={pageDescription} />
        <meta property='twitter:image' content={pageImage} />

        {seo?.canonicalUrl && <link rel="canonical" href={seo.canonicalUrl} />}
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
    </>
  )
}

export default HomepageShell
