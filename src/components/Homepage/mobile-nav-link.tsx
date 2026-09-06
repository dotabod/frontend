import Link from 'next/link'
import type { ComponentProps } from 'react'

interface MobileNavLinkProps extends ComponentProps<typeof Link> {}

export const MobileNavLink = ({ children, ...props }: MobileNavLinkProps) => (
  <Link className='block text-base leading-7 tracking-tight text-gray-300' {...props}>
    {children}
  </Link>
)
