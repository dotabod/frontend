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

interface PrivacyPolicyProps {
  source: MDXRemoteSerializeResult
}

const PrivacyPolicy: NextPageWithLayout<PrivacyPolicyProps> = ({ source }) => (
  <Container className='py-24'>
    <div className='max-w-none prose prose-invert'>
      <MDXRemote {...source} />
    </div>
  </Container>
)

PrivacyPolicy.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        title: 'Privacy Policy',
        subtitle: 'Learn about how Dotabod collects, uses, and protects your personal information.',
      }}
      seo={{
        title: 'Privacy Policy | Dotabod',
        description: 'Learn about how Dotabod collects, uses, and protects your personal information.',
        canonicalUrl: 'https://dotabod.com/privacy-policy',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export const getStaticProps: GetStaticProps<PrivacyPolicyProps> = async () => {
  const filePath = path.join(process.cwd(), 'src/pages/privacy-policy.mdx')
  const source = fs.readFileSync(filePath, 'utf8')
  const mdxSource = await serialize(source, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeHighlight],
    },
  })
  return { props: { source: mdxSource } }
}

export default PrivacyPolicy
