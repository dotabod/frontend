import clsx from 'clsx'

export const Card = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => (
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
