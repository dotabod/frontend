import { Popover, PopoverButton } from '@headlessui/react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { GiftIcon } from 'lucide-react'

import { Container } from 'src/components/Container'
import { Logo } from 'src/components/Logo'
import { NavLinks } from 'src/components/NavLinks'
import { ChevronUpIcon } from '../ChevronUpIcon'
import { LoginButton } from './LoginButton'
import { MenuIcon } from './MenuIcon'
import { MobileNavLink } from './MobileNavLink'

export function Header() {
  return (
    <header className='bg-gray-800'>
      <nav>
        <Container className='relative z-50 flex justify-between py-8'>
          <div className='relative z-10 flex items-center gap-16'>
            <Link href='/' aria-label='Home'>
              <Logo className='h-10 w-auto' />
            </Link>
            <div className='hidden lg:flex lg:gap-10'>
              <NavLinks />
            </div>
          </div>
          <div className='flex items-center gap-6'>
            <Popover className='lg:hidden'>
              {({ open }) => (
                <>
                  <PopoverButton
                    className='relative z-10 -m-2 inline-flex items-center rounded-lg stroke-slate-300 p-2 hover:bg-gray-200/50 hover:stroke-gray-600 active:stroke-gray-900 not-focus-visible:focus:outline-hidden'
                    aria-label='Toggle site navigation'
                  >
                    {({ open }) =>
                      open ? (
                        <ChevronUpIcon className='h-6 w-6' />
                      ) : (
                        <MenuIcon className='h-6 w-6' />
                      )
                    }
                  </PopoverButton>
                  <AnimatePresence initial={false}>
                    {open && (
                      <>
                        <Popover.Overlay
                          static
                          as={motion.div}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className='fixed inset-0 z-0 bg-gray-300/60 backdrop-blur-sm'
                        />
                        <Popover.Panel
                          static
                          as={motion.div}
                          initial={{ opacity: 0, y: -32 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{
                            opacity: 0,
                            y: -32,
                            transition: { duration: 0.2 },
                          }}
                          className='absolute inset-x-0 top-0 z-0 origin-top rounded-b-2xl bg-gray-800 px-6 pb-6 pt-32 shadow-2xl shadow-gray-900/20'
                        >
                          <div className='space-y-4'>
                            <MobileNavLink href='/#features'>Features</MobileNavLink>
                            <MobileNavLink href='/#pricing'>Pricing</MobileNavLink>
                            <MobileNavLink href='/gift'>
                              <span className="flex items-center gap-2">
                                <GiftIcon className="h-4 w-4" />
                                Gift Pro
                              </span>
                            </MobileNavLink>
                            <MobileNavLink href='/#faqs'>FAQs</MobileNavLink>
                            <MobileNavLink href='/contact'>Contact Us</MobileNavLink>
                            <MobileNavLink href='/blog'>Blog</MobileNavLink>
                            <MobileNavLink href='/privacy-policy'>Privacy Policy</MobileNavLink>
                            <MobileNavLink href='/terms-of-service'>Terms of Service</MobileNavLink>
                            <MobileNavLink href='/cookies'>Cookie Policy</MobileNavLink>
                            <MobileNavLink href='/dashboard'>Dashboard</MobileNavLink>
                            <MobileNavLink href='https://github.com/dotabod'>Github</MobileNavLink>
                            <MobileNavLink href='https://discord.dotabod.com'>
                              Discord
                            </MobileNavLink>
                          </div>
                          <div className='mt-8 flex flex-col gap-4'>
                            <LoginButton />
                          </div>
                        </Popover.Panel>
                      </>
                    )}
                  </AnimatePresence>
                </>
              )}
            </Popover>
            <LoginButton className='hidden lg:block' />
          </div>
        </Container>
      </nav>
    </header>
  )
}
