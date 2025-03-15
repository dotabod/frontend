import { Button, Result, Typography } from 'antd'
import { GiftIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { NextPageWithLayout } from '@/pages/_app'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { ReactElement } from 'react'

const { Paragraph } = Typography

const GiftSuccessPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { recipient } = router.query

  return (
    <>
      <Result
        icon={<GiftIcon className='h-16 w-16 text-green-500' />}
        status='success'
        title='Gift Sent Successfully!'
        subTitle={
          recipient
            ? `Your gift has been sent to ${recipient}.`
            : 'Your gift has been sent successfully.'
        }
        extra={[
          <Link href='/' key='home'>
            <Button type='primary' size='large'>
              Return Home
            </Button>
          </Link>,
          <Link href='/gift' key='buy-another'>
            <Button size='large'>Send Another Gift</Button>
          </Link>,
        ]}
      />

      <div className='text-center mt-8'>
        <Paragraph>
          Thank you for supporting Dotabod and your favorite streamer! Your gift subscription has
          been processed successfully.
        </Paragraph>
        <Paragraph>
          The recipient will be notified of your gift and can start using Dotabod Pro features
          immediately.
        </Paragraph>
      </div>
    </>
  )
}

GiftSuccessPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      seo={{
        title: 'Gift Sent Successfully | Dotabod',
        description: 'Your gift has been sent successfully.',
        canonicalUrl: 'https://dotabod.com/gift-success',
        noindex: true,
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default GiftSuccessPage
