import { Faqs } from '@/components/Homepage/Faqs'
import { Hero } from '@/components/Homepage/Hero'
import { PrimaryFeatures } from '@/components/Homepage/PrimaryFeatures'
import { SecondaryFeatures } from '@/components/Homepage/SecondaryFeatures'
import useMaybeSignout from '@/lib/hooks/useMaybeSignout'
import type { ReactNode } from 'react'
import HomepageShell from './HomepageShell'

const Home = ({ children }: { children?: ReactNode }) => {
  useMaybeSignout()

  return (
    <HomepageShell>
      {children}
      <Hero />
      <PrimaryFeatures />
      <SecondaryFeatures />
      <Faqs />
    </HomepageShell>
  )
}

export default Home
