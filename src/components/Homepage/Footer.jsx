import Link from 'next/link'

import { Container } from 'src/components/Container'
import { Logomark } from 'src/components/Logo'
import { NavLinks } from 'src/components/NavLinks'
import { QrCodeBorder } from './QrCodeBorder'

export function Footer() {
  return (
    <footer className='border-t border-gray-500 bg-gray-900'>
      <Container>
        <div className='flex flex-col items-start justify-between gap-y-12 pb-6 pt-16 lg:flex-row lg:items-center lg:py-16'>
          <div>
            <div className='flex items-center text-gray-200'>
              <Logomark className='h-10 w-auto flex-none fill-cyan-500' />
              <div className='ml-4'>
                <p className='text-base font-semibold'>Dotabod</p>
                <p className='mt-1 text-sm'>Enhance Your Dota 2 Streaming Experience</p>
              </div>
            </div>
            <nav className='mt-11'>
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
                <NavLinks bottom={true} />
              </div>
            </nav>
          </div>
          <div className='group relative -mx-4 flex items-center self-stretch p-4 transition-colors hover:bg-gray-800 sm:self-auto sm:rounded-2xl lg:mx-0 lg:self-auto lg:p-6'>
            <div className='relative flex h-24 w-24 flex-none items-center justify-center'>
              <QrCodeBorder className='absolute inset-0 h-full w-full stroke-gray-300 transition-colors group-hover:stroke-red-500' />
              <Logomark className='p-4' />
            </div>
            <div className='ml-8 lg:w-64'>
              <p className='text-base font-semibold'>
                <Link href='/dashboard' className='!text-gray-200'>
                  <span className='absolute inset-0 sm:rounded-2xl' />
                  <span>Be a better streamer</span>
                </Link>
              </p>
              <p className='mt-1 text-sm text-gray-300'>Login to our dashboard to get started.</p>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  )
}
