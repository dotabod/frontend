import { Typography } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { type ReactElement, useEffect } from 'react'
import { Container } from '@/components/Container'
import WhatsNewFeatureCard from '@/components/Dashboard/Features/WhatsNewFeatureCard'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { groupWhatsNewByDate, whatsNewSorted } from '@/lib/whatsNew'
import type { NextPageWithLayout } from '@/pages/_app'
import { formatDate } from '@/utils/formatDate'

const { Title, Paragraph } = Typography

const pageTitle = "What's New | Dotabod"
const pageDescription =
  'The latest Dotabod features, commands, and pages. Follow along as they ship.'
const canonicalUrl = 'https://dotabod.com/whats-new'

// Public, indexable changelog so anyone (logged in or not) can follow new releases. Same
// registry + cards as the dashboard page, rendered read-only (no toggles).
const WhatsNewPublic: NextPageWithLayout = () => {
  const entries = whatsNewSorted
  const groups = groupWhatsNewByDate(entries)

  // Logged-in streamers get bounced to the interactive dashboard version (where each entry has
  // its toggle). Done client-side so the public page stays statically generated/indexable for
  // guests and crawlers (which are never authenticated).
  const { status } = useSession()
  const router = useRouter()
  useEffect(() => {
    if (status === 'authenticated') {
      void router.replace('/dashboard/whats-new')
    }
  }, [status, router])

  // SEO (title/description/canonical/OG/Twitter) is rendered by HomepageShell from the
  // `seo` prop in getLayout below — no inline <Head> needed.
  return (
    <Container className='pb-16'>
      <div className='mx-auto max-w-3xl'>
        <Title level={1}>What&apos;s new</Title>
        <Paragraph className='mb-8 text-lg'>
          The latest Dotabod features, commands, and pages.{' '}
          <Link href='/dashboard/whats-new' className='text-purple-400 hover:text-purple-300'>
            Manage them in your dashboard
          </Link>
        </Paragraph>

        <div className='space-y-10'>
          {groups.map((group) => (
            <section key={group.releaseDate} aria-labelledby={`release-${group.releaseDate}`}>
              <div className='mb-4 flex items-center gap-3'>
                <h2
                  id={`release-${group.releaseDate}`}
                  className='m-0! text-sm font-semibold text-gray-200'
                >
                  <time dateTime={group.releaseDate}>{formatDate(group.releaseDate)}</time>
                </h2>
                <div className='h-px flex-1 bg-gray-700' aria-hidden='true' />
              </div>

              <div className='grid grid-cols-1 gap-6'>
                {group.entries.map((entry) => (
                  <div id={entry.id} key={entry.id} className='scroll-mt-6'>
                    <WhatsNewFeatureCard
                      entry={entry}
                      latest={entry.id === entries[0]?.id}
                      readOnly
                      showDate={false}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
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
