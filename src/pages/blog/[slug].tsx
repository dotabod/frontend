import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import { formatDate } from '@/utils/formatDate'
import { Button, Space, Typography } from 'antd'
import fs from 'fs'
import matter from 'gray-matter'
import type { GetStaticPaths, GetStaticProps } from 'next'
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import Link from 'next/link'
import path from 'path'
import type { ReactElement } from 'react'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

const { Title, Text, Paragraph } = Typography

interface BlogPostProps {
  source: MDXRemoteSerializeResult
  meta: {
    title: string
    description: string
    date: string
    author?: string
  }
}

const BlogPost: NextPageWithLayout<BlogPostProps> = ({ source, meta }) => {
  return (
    <Container className='pb-16'>
      <div className='max-w-3xl mx-auto'>
        <div className='mb-8'>
          <Button
            type='text'
            icon={
              <svg
                viewBox='0 0 16 16'
                fill='none'
                aria-hidden='true'
                className='h-4 w-4 stroke-current'
              >
                <path
                  d='M7.25 11.25 3.75 8m0 0 3.5-3.25M3.75 8h8.5'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            }
          >
            <Link href='/blog'>Back to blog</Link>
          </Button>
        </div>

        <article>
          <Space direction='vertical' size='small' className='mb-4'>
            <Text type='secondary'>{formatDate(meta.date)}</Text>
            {meta.author && <Text type='secondary'>By {meta.author}</Text>}
          </Space>

          <Title level={1} className='mb-8'>
            {meta.title}
          </Title>

          <div className='prose dark:prose-invert max-w-none'>
            <MDXRemote {...source} />
          </div>
        </article>
      </div>
    </Container>
  )
}

BlogPost.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell>{page}</HomepageShell>
}

export const getStaticPaths: GetStaticPaths = async () => {
  const postsDirectory = path.join(process.cwd(), 'src/pages/blog')
  const filenames = fs.readdirSync(postsDirectory)

  const paths = filenames
    .filter((filename) => filename.endsWith('.md'))
    .map((filename) => ({
      params: {
        slug: filename.replace(/\.md$/, ''),
      },
    }))

  return {
    paths,
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params as { slug: string }
  const filePath = path.join(process.cwd(), 'src/pages/blog', `${slug}.md`)
  const fileContents = fs.readFileSync(filePath, 'utf8')

  const { content, data } = matter(fileContents)

  // Process the frontmatter data to ensure all values are serializable
  const processedData = { ...data }

  // Convert Date objects to strings
  if (processedData.date instanceof Date) {
    processedData.date = processedData.date.toISOString()
  } else if (processedData.date) {
    processedData.date = String(processedData.date)
  }

  // Replace any undefined values with null
  Object.keys(processedData).forEach((key) => {
    if (processedData[key] === undefined) {
      processedData[key] = null
    }
  })

  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeHighlight],
    },
    scope: processedData, // Use the processed data
  })

  // Ensure date is a string for serialization
  const date = processedData.date || new Date().toISOString()

  return {
    props: {
      source: mdxSource,
      meta: {
        title: processedData.title || 'Untitled',
        description: processedData.description || '',
        date: date,
        author: processedData.author || null,
      },
    },
  }
}

export default BlogPost
