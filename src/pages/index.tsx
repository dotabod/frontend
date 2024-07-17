import { Faqs } from '@/components/Homepage/Faqs'
import { Hero } from '@/components/Homepage/Hero'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { PrimaryFeatures } from '@/components/Homepage/PrimaryFeatures'
import { SecondaryFeatures } from '@/components/Homepage/SecondaryFeatures'
import type { NextPageWithLayout } from '@/pages/_app'
import type { ReactElement } from 'react'

const Index: NextPageWithLayout = () => (
  <>
    <Hero />
    <PrimaryFeatures />
    <SecondaryFeatures />
    <Faqs />
  </>
)

Index.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell>{page}</HomepageShell>
}

export default Index
