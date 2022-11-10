"use client"

import { User } from "next-auth"
import { signOut } from "next-auth/react"
import Link from "next/link"

import { DropdownMenu } from "@/ui/dropdown"
import { UserAvatar } from "@/components/user-avatar"
import clsx from 'clsx'

interface UserAccountNavProps extends React.HTMLAttributes<HTMLDivElement> {
  user: Pick<User, 'name' | 'image' | 'email'>
}

const DropdownContent = ({ user }) => {
  return (
    <>
      <div className="flex items-center justify-start gap-2 p-4">
        <div className="flex flex-col space-y-1 leading-none">
          {user.name && <p className="font-medium">{user.name}</p>}
          {user.email && (
            <p className="w-[200px] truncate text-sm text-slate-600">
              {user.email}
            </p>
          )}
        </div>
      </div>
      <DropdownMenu.Separator />
      <DropdownMenu.Item>
        <Link href="/dashboard" className="w-full">
          Dashboard
        </Link>
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        <Link href="/dashboard/features" className="w-full">
          Features
        </Link>
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
      <DropdownMenu.Item>
        <Link
          href="https://github.com/dotabod/"
          className="w-full"
          target="_blank"
        >
          GitHub
        </Link>
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
      <DropdownMenu.Item
        className="cursor-pointer"
        onSelect={(event) => {
          event.preventDefault()
          signOut({
            callbackUrl: `${window.location.origin}/`,
          })
        }}
      >
        Sign out
      </DropdownMenu.Item>
    </>
  )
}

export function UserAccountNav({ user, className }: UserAccountNavProps) {
  return (
    <>
      <div className="hidden lg:block">
        <DropdownMenu>
          <DropdownMenu.Trigger
            className={clsx(
              'focus:ring-brand-900 flex items-center gap-2 overflow-hidden focus:ring-2 focus:ring-offset-2 focus-visible:outline-none',
              className
            )}
          >
            <UserAvatar user={{ name: user.name, image: user.image }} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="mt-2 md:w-[241px]" align="end">
              <DropdownContent user={user} />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu>
      </div>
    </>
  )
}
