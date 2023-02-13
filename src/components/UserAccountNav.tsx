import { useSession } from 'next-auth/react'

import { Avatar } from 'antd'
import clsx from 'clsx'
import Link from 'next/link'
import { Session } from 'next-auth'
import { fetcher } from '@/lib/fetcher'
import useSWR from 'swr'

interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  user: Session['user']
  showDetails: boolean
  icon?: React.ReactNode
  dark: boolean
}

const UserButton = ({ user, showDetails, dark }: UserButtonProps) => {
  const { data } = useSWR('/api/settings', fetcher)
  const isLive = data?.stream_online

  return (
    <Link href="/dashboard/features">
      <div
        className={clsx(
          isLive && 'animate-border-rgb',
          `outline:transparent group block h-full w-full cursor-pointer rounded-md border border-transparent px-3.5
            py-2 text-left text-sm transition-all
            `,
          dark
            ? `bg-dark-800 text-dark-200 hover:bg-dark-700`
            : `bg-dark-800 text-dark-300 hover:bg-gray-200`
        )}
      >
        {showDetails && (
          <div className="flex h-full w-full items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar src={user?.image} />
              <span className="font-500 text-sm">{user?.name}</span>
            </div>

            {isLive ? (
              <span className="rounded-md bg-red-700 px-2 py-0.5 text-xs">
                Live
              </span>
            ) : (
              <span className="rounded-md bg-dark-700 px-2 py-0.5 text-xs">
                Offline
              </span>
            )}
          </div>
        )}

        {!showDetails && <Avatar className="m-auto" src={user?.image} />}
      </div>
    </Link>
  )
}

UserButton.displayName = 'UserButton'

export function UserAccountNav({ showDetails = false, dark = false }) {
  const user = useSession()?.data?.user

  return <UserButton dark={dark} showDetails={showDetails} user={user} />
}
