import { useSession } from 'next-auth/react'

import { forwardRef } from 'react'
import { Group, Avatar, Text } from '@mantine/core'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
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

const UserButton = forwardRef<HTMLButtonElement, UserButtonProps>(
  (
    {
      user: { image, name },
      icon,
      showDetails,
      dark,
      ...others
    }: UserButtonProps,
    ref
  ) => {
    const { data } = useSWR('/api/settings', fetcher)
    const isLive = data?.stream_online

    return (
      <Link className="block h-full" href="/dashboard/features">
        <button
          ref={ref}
          {...others}
          className={clsx(
            isLive && 'animate-border-rgb',
            `outline:transparent group w-full rounded-md border border-transparent px-3.5
            py-2 text-left text-sm transition-all
            focus:ring-2 `,
            dark
              ? `bg-[#17181e] text-white hover:border hover:border-blue-500 hover:bg-[#17181e] focus:ring-offset-blue-100`
              : `bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-100`,
            showDetails
              ? 'cursor-default select-text hover:border-transparent focus:ring-transparent focus:ring-offset-transparent'
              : 'cursor-pointer'
          )}
        >
          <Group>
            {showDetails && (
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar size="sm" src={image} radius="xl" />

                  <Text size="sm" weight={500}>
                    {name}
                  </Text>
                </div>

                {isLive ? (
                  <Text
                    color="dimmed"
                    size="xs"
                    className="rounded-md bg-red-700 px-2 py-0.5"
                  >
                    Live
                  </Text>
                ) : (
                  <Text
                    color="dimmed"
                    size="xs"
                    className="rounded-md bg-dark-700 px-2 py-0.5"
                  >
                    Offline
                  </Text>
                )}
              </div>
            )}

            {!showDetails && (icon || <ChevronRightIcon height={16} />)}
          </Group>
        </button>
      </Link>
    )
  }
)

UserButton.displayName = 'UserButton'

export function UserAccountNav({ showDetails = false, dark = false }) {
  const user = useSession()?.data?.user

  return <UserButton dark={dark} showDetails={showDetails} user={user} />
}
