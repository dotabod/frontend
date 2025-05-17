import { PopoverButton } from '@headlessui/react'
import Link from 'next/link'
import type { ComponentProps } from 'react'

interface MobileNavLinkProps extends ComponentProps<typeof Link> {}

export function MobileNavLink({ children, ...props }: MobileNavLinkProps) {
  return (
    <PopoverButton
      as={Link}
      className='block text-base leading-7 tracking-tight text-gray-300'
      {...props}
    >
      {children}
    </PopoverButton>
  )
}
