import fs from 'node:fs'
import path from 'node:path'
import { Button, Space, Typography } from 'antd'
import matter from 'gray-matter'
import type { GetStaticPaths, GetStaticProps } from 'next'
import Link from 'next/link'
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import type { ReactElement } from 'react'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import { formatDate } from '@/utils/formatDate'

const { Title, Text } = Typography

interface BlogPostProps {
  source: MDXRemoteSerializeResult
  meta: {
    title: string
    description: string
    date: string
    author?: string
    image?: string
    slug: string
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
          <div className='max-w-none prose prose-invert prose-headings:font-bold prose-headings:text-gray-300 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:text-gray-300 prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-gray-500 prose-li:text-gray-300 prose-ul:ml-5 prose-ol:ml-5 prose-li:pl-0 prose-code:bg-gray-800 prose-code:text-gray-200 prose-pre:bg-gray-800 prose-pre:text-gray-200 prose-blockquote:text-gray-400 prose-blockquote:border-gray-600'>
            <MDXRemote {...source} />
          </div>
        </article>
      </div>
    </Container>
  )
}

BlogPost.getLayout = function getLayout(page: ReactElement) {
  const { meta } = page.props as BlogPostProps
  const pageTitle = `${meta.title} | Dotabod Blog`
  const canonicalUrl = `https://dotabod.com/blog/${meta.slug}`

  return (
    <HomepageShell
      ogImage={{
        title: meta.title,
        subtitle: meta.description,
      }}
      seo={{
        title: pageTitle,
        description: meta.description,
        canonicalUrl: canonicalUrl,
        ogType: 'article',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const postsDirectory = path.join(process.cwd(), 'src/pages/blog')
  const filenames = fs.readdirSync(postsDirectory)

  const paths = filenames
    .filter((filename) => filename.endsWith('.md'))
    .filter((filename) => {
      // Filter out draft posts
      const filePath = path.join(postsDirectory, filename)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data } = matter(fileContents)
      return !data.draft
    })
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

  // Check if post is a draft
  if (data.draft) {
    return {
      notFound: true,
    }
  }

  // Process the frontmatter data to ensure all values are serializable
  const processedData = { ...data }

  // Convert Date objects to strings
  if (processedData.date instanceof Date) {
    processedData.date = processedData.date.toISOString()
  } else if (processedData.date) {
    processedData.date = String(processedData.date)
  }

  // Replace any undefined values with null
  for (const key of Object.keys(processedData)) {
    if (processedData[key] === undefined) {
      processedData[key] = null
    }
  }

  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeHighlight],
    },
    scope: processedData, // Use the processed data
  })

  // Ensure date is a string for serialization
  const date = processedData.date || new Date().toISOString()

  // Convert date to string if it's a Date object
  const dateString = date instanceof Date ? date.toISOString() : String(date)

  return {
    props: {
      source: mdxSource,
      meta: {
        title: processedData.title || 'Untitled',
        description: processedData.description || '',
        date: dateString,
        author: processedData.author || null,
        image: processedData.image || null,
        slug, // Add slug to meta for canonical URL
      },
    },
  }
}

export default BlogPost
