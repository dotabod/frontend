import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

import { forwardRef } from 'react'
import { Group, Avatar, Text, Menu, UnstyledButton } from '@mantine/core'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { LogOut, Settings } from 'lucide-react'

interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  image: string
  name: string
  email: string
  showDetails: boolean
  icon?: React.ReactNode
}

const UserButton = forwardRef<HTMLButtonElement, UserButtonProps>(
  (
    { image, name, email, icon, showDetails, ...others }: UserButtonProps,
    ref
  ) => (
    <button
      ref={ref}
      {...others}
      className="group w-full rounded-md bg-gray-100 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-100"
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

        {icon || <ChevronRightIcon height={16} />}
      </Group>
    </button>
  )
)

UserButton.displayName = 'UserButton'

export function UserAccountNav({ showDetails = false }) {
  const user = useSession()?.data?.user

  return (
    <Group position="center">
      <Menu withArrow>
        <Menu.Target>
          <UserButton
            showDetails={showDetails}
            image={user?.image}
            name={user?.name}
            email="Dota 2 Streamer"
          />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{user?.name}</Menu.Label>
          <Menu.Item
            component={Link}
            href="/dashboard"
            icon={<Settings size={14} />}
          >
            Dashboard
          </Menu.Item>
          <Menu.Item
            component={Link}
            href="/dashboard/features"
            icon={<Settings size={14} />}
          >
            Features
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            component="a"
            onClick={() => {
              signOut({
                callbackUrl: `${window.location.origin}/`,
              })
            }}
            icon={<LogOut size={14} />}
          >
            Log out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  )
}
