import clsx from 'clsx'
export function PhoneFrame({
  className,
  children,
  priority = false,
  ...props
}) {
  return (
    <div className={clsx('relative aspect-[366/729]', className)} {...props}>
      {children}
    </div>
  )
}
