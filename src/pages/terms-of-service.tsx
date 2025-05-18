import fs from 'node:fs'
import path from 'node:path'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import type { GetStaticProps } from 'next'
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import type { ReactElement } from 'react'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'

interface TermsProps {
  source: MDXRemoteSerializeResult
}

const TermsOfService: NextPageWithLayout<TermsProps> = ({ source }) => (
  <Container className='py-24'>
    <div className='max-w-none prose prose-invert'>
      <MDXRemote {...source} />
    </div>
  </Container>
)

TermsOfService.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        title: 'Terms of Service',
        subtitle: 'Read the terms and conditions that govern your use of Dotabod services.',
      }}
      seo={{
        title: 'Terms of Service | Dotabod',
        description: 'Read the terms and conditions that govern your use of Dotabod services.',
        canonicalUrl: 'https://dotabod.com/terms-of-service',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export const getStaticProps: GetStaticProps<TermsProps> = async () => {
  const filePath = path.join(process.cwd(), 'src/pages/terms-of-service.mdx')
  const source = fs.readFileSync(filePath, 'utf8')
  const mdxSource = await serialize(source, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeHighlight],
    },
  })
  return { props: { source: mdxSource } }
}

export default TermsOfService
