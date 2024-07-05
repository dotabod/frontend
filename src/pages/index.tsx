import Home from '@/components/Homepage/Home'
import type { NextPageWithLayout } from '@/pages/_app'
import type { ReactElement } from 'react'

const Index: NextPageWithLayout = () => {
  return <Home />
}

Index.getLayout = function getLayout(page: ReactElement) {
  return page
}

export default Index
