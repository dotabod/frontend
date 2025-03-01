import { PopoverButton } from '@headlessui/react'
import Link from 'next/link'

export function MobileNavLink({ children, ...props }) {
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
