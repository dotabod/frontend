import { Typography } from 'antd'
import Link from 'next/link'
import type { ReactElement } from 'react'
import { Container } from '@/components/Container'
import WhatsNewFeatureCard from '@/components/Dashboard/Features/WhatsNewFeatureCard'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { whatsNewSorted } from '@/lib/whatsNew'
import type { NextPageWithLayout } from '@/pages/_app'

const { Title, Paragraph } = Typography

const pageTitle = "What's New | Dotabod"
const pageDescription =
  'The latest Dotabod features, commands, and pages. Follow along as they ship.'
const canonicalUrl = 'https://dotabod.com/whats-new'

// Public, indexable changelog so anyone (logged in or not) can follow new releases. Same
// registry + cards as the dashboard page, rendered read-only (no toggles).
const WhatsNewPublic: NextPageWithLayout = () => {
  const entries = whatsNewSorted

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

        <div className='grid grid-cols-1 gap-6'>
          {entries.map((entry, i) => (
            <div id={entry.id} key={entry.id}>
              <WhatsNewFeatureCard entry={entry} latest={i === 0} readOnly />
            </div>
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
