import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Container({ className = '', ...props }: ContainerProps) {
  return (
    <div className={clsx('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props} />
  )
}
