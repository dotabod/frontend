import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import type { ReactElement } from 'react'

const NotFound: NextPageWithLayout = () => {
  // Opinionated: do not record an exception in Sentry for 404
  return (
    <div
      className='grid grid-cols-1 grid-rows-[1fr,auto,1fr lg:grid-cols-[max(50%,36rem),1fr]'
      style={{
        minHeight: 'inherit',
      }}
    >
      <main className='mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:px-8'>
        <div className='max-w-lg'>
          <h1 className='mt-4 text-3xl font-bold tracking-tight sm:text-5xl'>Page not found</h1>
          <p className='mt-6 text-base leading-7'>
            Sorry, we couldn't find the page you're looking for.
          </p>
          <div className='mt-10'>
            <a href='/' className='text-sm font-semibold leading-7'>
              <span aria-hidden='true'>&larr;</span> Back to home
            </a>
          </div>
        </div>
      </main>
      <div className='hidden lg:relative lg:col-start-2 lg:row-start-1 lg:row-end-4 lg:block'>
        <img
          src='/images/404.webp'
          alt=''
          className='absolute inset-0 h-full w-full object-cover rounded'
        />
      </div>
    </div>
  )
}

NotFound.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell>{page}</HomepageShell>
}

export default NotFound
