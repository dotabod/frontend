import { Alert } from 'antd'
import type { ReactElement } from 'react'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'

const Maintenance: NextPageWithLayout = () => (
  <Container className='py-24'>
    <Alert
      description='Dotabod is temporarily offline for everyone. We are currently undergoing scheduled maintenance. Please check back later.'
      message='Scheduled Maintenance'
      type='warning'
      showIcon
    />
  </Container>
)

Maintenance.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        title: 'Maintenance',
        subtitle: 'Dotabod is currently undergoing scheduled maintenance. Please check back later.',
      }}
      seo={{
        title: 'Maintenance | Dotabod',
        description:
          'Dotabod is currently undergoing scheduled maintenance. Please check back later.',
        canonicalUrl: 'https://dotabod.com/maintenance',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default Maintenance
