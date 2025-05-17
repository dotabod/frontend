import Link from 'next/link'
import type { ComponentProps } from 'react'

interface MobileNavLinkProps extends ComponentProps<typeof Link> {}

export function MobileNavLink({ children, ...props }: MobileNavLinkProps) {
  return (
    <Link className='block text-base leading-7 tracking-tight text-gray-300' {...props}>
      {children}
    </Link>
  )
}
