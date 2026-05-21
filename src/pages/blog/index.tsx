import { Space, Typography } from 'antd'
import type { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import type { ReactElement } from 'react'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { getAllPosts, type Post } from '@/lib/blog'
import type { NextPageWithLayout } from '@/pages/_app'
import { Card } from '@/ui/card'
import { formatDate } from '@/utils/formatDate'

const { Title, Text, Paragraph } = Typography

interface BlogIndexProps {
  posts: Post[]
}

const BlogIndex: NextPageWithLayout<BlogIndexProps> = ({ posts }) => {
  const pageTitle = 'Blog | Dotabod'
  const pageDescription = 'Latest news, updates, and insights from the Dotabod team'
  const canonicalUrl = 'https://dotabod.com/blog'

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='description' content={pageDescription} />
        <link rel='canonical' href={canonicalUrl} />

        {/* Open Graph / Facebook */}
        <meta property='og:type' content='website' />
        <meta property='og:url' content={canonicalUrl} />
        <meta property='og:title' content={pageTitle} />
        <meta property='og:description' content={pageDescription} />

        {/* Twitter */}
        <meta property='twitter:card' content='summary_large_image' />
        <meta property='twitter:url' content={canonicalUrl} />
        <meta property='twitter:title' content={pageTitle} />
        <meta property='twitter:description' content={pageDescription} />
      </Head>
      <Container className='pb-16'>
        <div className='max-w-3xl mx-auto'>
          <Title level={1}>Blog</Title>
          <Paragraph className='text-lg   mb-8'>
            Updates, announcements, and insights about Dotabod.
          </Paragraph>

          <Space direction='vertical' size='large' className='w-full'>
            {posts.map((post) => (
              <Card key={post.slug}>
                <Space direction='vertical' size='small'>
                  <Text type='secondary' className='block mb-2'>
                    {formatDate(post.date)}
                  </Text>
                  <Link href={`/blog/${post.slug}`} className='no-underline'>
                    <Title level={3} className='mb-2 text-purple-600 dark:text-purple-400'>
                      {post.title}
                    </Title>
                  </Link>
                  <Paragraph className=' '>{post.description}</Paragraph>
                  <Link
                    href={`/blog/${post.slug}`}
                    className='text-purple-500 font-medium flex items-center'
                  >
                    Read article
                    <svg
                      viewBox='0 0 16 16'
                      fill='none'
                      aria-hidden='true'
                      className='ml-1 h-4 w-4 stroke-current'
                    >
                      <path
                        d='M6.75 5.75 9.25 8l-2.5 2.25'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </Link>
                </Space>
              </Card>
            ))}
          </Space>
        </div>
      </Container>
    </>
  )
}

BlogIndex.getLayout = function getLayout(page: ReactElement) {
  const pageTitle = 'Blog | Dotabod'
  const pageDescription = 'Latest news, updates, and insights from the Dotabod team'
  const canonicalUrl = 'https://dotabod.com/blog'

  return (
    <HomepageShell
      ogImage={{
        title: 'Blog',
        subtitle: 'Latest news, updates, and insights from the Dotabod team',
      }}
      seo={{
        title: pageTitle,
        description: pageDescription,
        canonicalUrl: canonicalUrl,
        ogType: 'website',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      posts: getAllPosts(),
    },
  }
}

export default BlogIndex
