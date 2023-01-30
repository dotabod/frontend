import { useSession } from 'next-auth/react'

import { forwardRef } from 'react'
import { Group, Avatar, Text } from '@mantine/core'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  image: string
  name: string
  email: string
  showDetails: boolean
  icon?: React.ReactNode
  dark: boolean
}

const UserButton = forwardRef<HTMLButtonElement, UserButtonProps>(
  (
    { image, name, email, icon, showDetails, dark, ...others }: UserButtonProps,
    ref
  ) => (
    <Link href="/dashboard/features">
      <button
        ref={ref}
        {...others}
        className={clsx(
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
          <Avatar src={image} radius="xl" />

          {showDetails && (
            <div style={{ flex: 1 }}>
              <Text size="sm" weight={500}>
                {name}
              </Text>

              <Text color="dimmed" size="xs">
                {email}
              </Text>
            </div>
          )}

          {!showDetails && (icon || <ChevronRightIcon height={16} />)}
        </Group>
      </button>
    </Link>
  )
)

UserButton.displayName = 'UserButton'

export function UserAccountNav({ showDetails = false, dark = false }) {
  const user = useSession()?.data?.user

  return (
    <UserButton
      dark={dark}
      showDetails={showDetails}
      image={user?.image}
      name={user?.name}
      email="Dota 2 Streamer"
    />
  )
}
