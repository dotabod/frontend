import * as React from 'react'
import clsx from 'clsx'

interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DashboardShell({
  children,
  className,
  ...props
}: DashboardShellProps) {
  return (
    <div className={clsx('grid items-start gap-8', className)} {...props}>
      {children}
    </div>
  )
}
