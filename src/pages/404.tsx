import { Tooltip } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import { GiftIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactElement } from 'react'
import { useState } from 'react'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'

type NavLinkItem = [string, string, string?]

const NotFound: NextPageWithLayout = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Using the same navigation links as in NavLinks.tsx
  const mainNavLinks: NavLinkItem[] = [
    ['Features', '/#features'],
    ['Pricing', '/#pricing'],
    ['FAQs', '/#faqs'],
    ['Blog', '/blog'],
    ['Gift Pro', '/gift', 'Gift Dotabod Pro to your favorite streamer'],
    ['Contact Us', '/contact'],
  ]

  // Additional helpful links
  const additionalLinks: NavLinkItem[] = [
    ['Home', '/'],
    ['Privacy Policy', '/privacy-policy'],
    ['Terms of Service', '/terms-of-service'],
    ['Cookie Policy', '/cookies'],
    ['Discord', 'https://discord.dotabod.com'],
  ]

  const renderNavLink = (link: NavLinkItem, index: number, isMainNav = true) => {
    const [label, href, tooltip] = link
    const isGiftLink = label === 'Gift Pro'

    return (
      <Tooltip key={label} title={tooltip} placement='top'>
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          className={`relative flex items-center rounded-lg px-3 py-2 text-sm transition-colors delay-150 ${
            isMainNav
              ? 'text-gray-300 hover:text-gray-500 hover:delay-[0ms]'
              : 'text-purple-400 hover:text-purple-300'
          }`}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === index && isMainNav && (
              <motion.span
                className='absolute inset-0 rounded-lg bg-gray-700'
                layoutId='hoverBackground'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>

          <span className='relative z-10 flex items-center gap-2'>
            {isGiftLink && <GiftIcon className='h-4 w-4' />}
            {label}
          </span>
        </a>
      </Tooltip>
    )
  }

  return (
    <div
      className='grid grid-cols-1 grid-rows-[1fr,auto,1fr] lg:grid-cols-[max(50%,36rem)_1fr] bg-gray-900 text-gray-100'
      style={{
        minHeight: 'inherit',
      }}
    >
      <main className='mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:px-8'>
        <div className='max-w-lg'>
          <div className='text-purple-400'>
            <span className='text-7xl font-bold'>404</span>
          </div>
          <h1 className='mt-4 text-3xl font-bold tracking-tight sm:text-5xl text-white'>
            Oops! Page not found
          </h1>
          <p className='mt-6 text-base leading-7 text-gray-300'>
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Main navigation links */}
          <div className='mt-8'>
            <h2 className='text-sm font-semibold text-gray-300 mb-3'>Main navigation:</h2>
            <div className='flex flex-wrap gap-1'>
              {mainNavLinks.map((link, index) => renderNavLink(link, index))}
            </div>
          </div>

          {/* Additional helpful links */}
          <div className='mt-8'>
            <h2 className='text-sm font-semibold text-gray-300 mb-3'>Additional links:</h2>
            <div className='grid grid-cols-2 gap-x-4 gap-y-1'>
              {additionalLinks.map((link, index) =>
                renderNavLink(link, index + mainNavLinks.length, false),
              )}
            </div>
          </div>

          <div className='mt-10'>
            <Link
              href='/'
              className='inline-flex items-center rounded-md bg-purple-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 transition-colors'
            >
              <span aria-hidden='true'>&larr;</span>
              <span className='ml-1'>Back to home</span>
            </Link>
          </div>
        </div>
      </main>
      <div className='hidden lg:relative lg:col-start-2 lg:row-start-1 lg:row-end-4 lg:block'>
        <div className='absolute inset-0 bg-gradient-to-r from-gray-900 to-transparent z-10' />
        <img
          src='/images/404.webp'
          alt='Lost in space illustration'
          className='absolute inset-0 h-full w-full object-cover rounded-sm opacity-80'
        />
      </div>
    </div>
  )
}

NotFound.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        title: 'Page Not Found',
        subtitle: 'The page you are looking for could not be found.',
      }}
      seo={{
        title: 'Page Not Found | Dotabod',
        description: 'The page you are looking for could not be found.',
        canonicalUrl: 'https://dotabod.com/404',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default NotFound
