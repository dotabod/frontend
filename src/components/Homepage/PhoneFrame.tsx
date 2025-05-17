import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

interface PhoneFrameProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: ReactNode
  priority?: boolean
}

export function PhoneFrame({ className, children, priority = false, ...props }: PhoneFrameProps) {
  return (
    <div className={clsx('relative aspect-366/729', className)} {...props}>
      {children}
    </div>
  )
}
