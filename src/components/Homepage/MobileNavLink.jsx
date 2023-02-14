import Link from 'next/link'
import { Popover } from '@headlessui/react'

export function MobileNavLink({ children, ...props }) {
  return (
    <Popover.Button
      as={Link}
      className="block text-base leading-7 tracking-tight text-gray-300"
      {...props}
    >
      {children}
    </Popover.Button>
  )
}
