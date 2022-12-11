import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

import { forwardRef } from 'react'
import { Group, Avatar, Text, Menu } from '@mantine/core'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { LogOut } from 'lucide-react'
import clsx from 'clsx'
import { navigation } from './DashboardShell'

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
    <button
      ref={ref}
      {...others}
      className={clsx(
        `outline:transparent group w-full rounded-md border border-transparent px-3.5
        py-2 text-left text-sm transition-all
        focus:ring-2 `,
        dark
          ? `bg-[#17181e] text-white hover:border hover:border-blue-500 hover:bg-[#17181e] focus:ring-offset-blue-100`
          : `bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-100`
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

        {icon || <ChevronRightIcon height={16} />}
      </Group>
    </button>
  )
)

UserButton.displayName = 'UserButton'

export function UserAccountNav({ showDetails = false, dark = false }) {
  const user = useSession()?.data?.user

  return (
    <Group position="center">
      <Menu withArrow>
        <Menu.Target>
          <UserButton
            dark={dark}
            showDetails={showDetails}
            image={user?.image}
            name={user?.name}
            email="Dota 2 Streamer"
          />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{user?.name}</Menu.Label>
          {navigation.map((item, i) => {
            if (!item.name)
              return (
                <div key={i} className="!my-2 mx-4 border-t border-dark-400" />
              )

            return (
              <Menu.Item
                key={item.name}
                component={Link}
                href={item.href}
                icon={<item.icon className="h-4 w-4" />}
              >
                {item.name}
              </Menu.Item>
            )
          })}

          <div className="!my-2 mx-4 border-t border-dark-400" />

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
