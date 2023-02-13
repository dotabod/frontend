import clsx from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-transparent bg-dark-900 p-5 text-sm text-dark-300 shadow-lg transition-all hover:border hover:border-blue-600 hover:shadow-blue-500/10',
        className
      )}
      {...props}
    />
  )
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

Card.Footer = function CardFooter({
  className,
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={clsx('block text-sm font-medium sm:rounded-b-lg', className)}
      {...props}
    >
      <div className="grid w-full border-t border-solid border-dark-700  pt-4"></div>
      {children}
    </div>
  )
}
