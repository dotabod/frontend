'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

import clsx from 'clsx'

type DropdownMenuProps = DropdownMenuPrimitive.DropdownMenuProps

export function DropdownMenu({ ...props }: DropdownMenuProps) {
  return <DropdownMenuPrimitive.Root {...props} />
}

DropdownMenu.Trigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuPrimitive.DropdownMenuTriggerProps
>(function DropdownMenuTrigger({ ...props }, ref) {
  return <DropdownMenuPrimitive.Trigger {...props} ref={ref} />
})

DropdownMenu.Portal = DropdownMenuPrimitive.Portal

DropdownMenu.Content = React.forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.MenuContentProps
>(function DropdownMenuContent({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Content
      ref={ref}
      align="end"
      className={clsx(
        'animate-in slide-in-from-top-1 overflow-hidden rounded-md border border-slate-50 bg-white shadow-md md:w-32',
        className
      )}
      {...props}
    />
  )
})

DropdownMenu.Item = React.forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuItemProps
>(function DropdownMenuItem({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={clsx(
        'flex cursor-default select-none items-center py-2 px-3 text-sm text-slate-500 outline-none focus:bg-slate-50 focus:text-black',
        className
      )}
      {...props}
    />
  )
})

DropdownMenu.Separator = React.forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuSeparatorProps
>(function DropdownMenuItem({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={clsx('h-px bg-slate-200', className)}
      {...props}
    />
  )
})
