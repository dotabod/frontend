import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import type { ReactElement } from 'react'

import { Container } from '@/components/Container'
import WhatsNewFeed from '@/components/Dashboard/Features/WhatsNewFeed'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { whatsNewSorted } from '@/lib/whatsNew'
import type { NextPageWithLayout } from '@/pages/_app'

const pageTitle = "What's New | Dotabod"
const pageDescription =
  'A running record of new Dotabod features, fixes, commands, and public pages.'
const canonicalUrl = 'https://dotabod.com/whats-new'

// Public, indexable changelog for guests and crawlers. Signed-in streamers move to the dashboard
// version, where releases that own a setting also expose their control.
const WhatsNewPublic: NextPageWithLayout = () => {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      void router.replace('/dashboard/whats-new')
    }
  }, [status, router])

  return (
    <Container className='pt-14 pb-24 sm:pt-20'>
      <div className='mx-auto max-w-5xl'>
        <header className='mb-14 max-w-3xl sm:mb-16'>
          <p className='mb-3 text-sm font-medium text-purple-300'>Dotabod changelog</p>
          <h1 className='m-0! text-4xl font-semibold tracking-tight text-gray-100 sm:text-5xl'>
            What&apos;s new
          </h1>
          <p className='mt-5 mb-0! max-w-2xl text-base leading-7 text-gray-300 sm:text-lg'>
            A running record of new features, fixes, commands, and public pages. No launch-day
            gloss, just what changed and how it works.
          </p>
          <Link
            href='/dashboard/whats-new'
            className='mt-5 inline-block text-sm font-medium text-purple-400 hover:text-purple-300'
          >
            Sign in to manage feature access
          </Link>
        </header>

        <WhatsNewFeed entries={whatsNewSorted} readOnly />
      </div>
    </Container>
  )
}

WhatsNewPublic.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{ subtitle: pageDescription, title: "What's New" }}
      seo={{ canonicalUrl, description: pageDescription, ogType: 'website', title: pageTitle }}
    >
      {page}
    </HomepageShell>
  )
}

export default WhatsNewPublic
