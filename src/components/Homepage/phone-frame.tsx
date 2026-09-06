import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

interface PhoneFrameProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: ReactNode
  priority?: boolean
}

export const PhoneFrame = ({
  className,
  children,
  priority: _priority = false,
  ...props
}: PhoneFrameProps) => (
  <div className={clsx('relative aspect-366/729', className)} {...props}>
    {children}
  </div>
)
