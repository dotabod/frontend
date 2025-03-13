import { Logomark } from '@/components/Logo'
import { Button, Card, Layout, Result, Typography } from 'antd'
import { GiftIcon } from 'lucide-react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { NextPageWithLayout } from '@/pages/_app'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { ReactElement } from 'react'

const { Title, Paragraph } = Typography
const { Content } = Layout

const GiftSuccessPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { recipient } = router.query

  return (
    <>
      <Head>
        <title>Gift Sent Successfully | Dotabod</title>
      </Head>
      <Layout className='min-h-screen bg-gray-50'>
        <Content className='p-6 md:p-12'>
          <div className='max-w-4xl mx-auto'>
            <div className='flex items-center mb-8'>
              <Logomark className='h-10 w-10 mr-3' />
              <Title level={2} className='m-0'>
                Dotabod Pro
              </Title>
            </div>

            <Card>
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
                  Thank you for supporting Dotabod and your favorite streamer! Your gift
                  subscription has been processed successfully.
                </Paragraph>
                <Paragraph>
                  The recipient will be notified of your gift and can start using Dotabod Pro
                  features immediately.
                </Paragraph>
              </div>
            </Card>
          </div>
        </Content>
      </Layout>
    </>
  )
}

GiftSuccessPage.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell>{page}</HomepageShell>
}

export default GiftSuccessPage
