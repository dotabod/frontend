import * as AvatarPrimitive from '@radix-ui/react-avatar'

import clsx from 'clsx'

type AvatarProps = AvatarPrimitive.AvatarProps

export function Avatar({ className, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={clsx(
        'flex h-[32px] w-[32px] items-center justify-center overflow-hidden rounded-full bg-slate-100',
        className
      )}
      {...props}
    />
  )
}

type AvatarImageProps = AvatarPrimitive.AvatarImageProps

Avatar.Image = function AvatarImage({ className, ...props }: AvatarImageProps) {
  return <AvatarPrimitive.Image className={clsx('', className)} {...props} />
}

Avatar.Fallback = function AvatarFallback({
  className,
  children,
  ...props
}: AvatarPrimitive.AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      delayMs={500}
      className={clsx('', className)}
      {...props}
    >
      {children}
    </AvatarPrimitive.Fallback>
  )
}
