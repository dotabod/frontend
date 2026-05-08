import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

export const Card = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={clsx(
        className,
        'flex flex-col items-center rounded-sm bg-slate-700/50 p-1 text-white/90',
      )}
      {...props}
    >
      {children}
    </div>
  )
}
