import { signOut, useSession } from 'next-auth/react'

import { Avatar, Dropdown, Space } from 'antd'
import clsx from 'clsx'
import Link from 'next/link'
import { Session } from 'next-auth'
import { fetcher } from '@/lib/fetcher'
import useSWR from 'swr'
import Image from 'next/image'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

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
          'text-gray-200',
          isLive && 'animate-border-rgb',
          `outline:transparent group block h-full w-full cursor-pointer rounded-md border border-transparent px-3.5
            py-2 text-left text-sm transition-all
            `
        )}
      >
        {showDetails && (
          <div className="flex h-full w-full items-center justify-between space-x-4">
            <Dropdown
              menu={{
                items: [
                  {
                    label: 'Logout',
                    key: 'logout',
                    onClick: () => {
                      signOut({
                        callbackUrl: `${window.location.origin}/`,
                      })
                    },
                  },
                ],
              }}
            >
              <Space>
                {isLive ? (
                  <span className="rounded-md bg-red-700 px-2 py-0.5 text-xs">
                    Live
                  </span>
                ) : (
                  <span className="rounded-md bg-gray-700 px-2 py-0.5 text-xs">
                    Offline
                  </span>
                )}
                <Image
                  width={40}
                  height={40}
                  alt="User Avatar"
                  src={user?.image}
                  className={clsx(
                    isLive &&
                      'animate-border-rgb rounded-full border-2 border-solid border-red-500'
                  )}
                />
                <ChevronDownIcon className="h-4 w-4" />
              </Space>
            </Dropdown>
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
