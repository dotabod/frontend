"use client"

import { User } from "next-auth"
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

import { DropdownMenu } from '@/ui/dropdown'

import { forwardRef } from 'react'
import { Group, Avatar, Text, Menu, UnstyledButton } from '@mantine/core'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { LogOut, Settings } from 'lucide-react'

interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  image: string
  name: string
  email: string
  icon?: React.ReactNode
}

const UserButton = forwardRef<HTMLButtonElement, UserButtonProps>(
  ({ image, name, email, icon, ...others }: UserButtonProps, ref) => (
    <UnstyledButton
      ref={ref}
      sx={(theme) => ({
        display: 'block',
        width: '100%',
        padding: theme.spacing.md,
        color:
          theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,

        '&:hover': {
          backgroundColor:
            theme.colorScheme === 'dark'
              ? theme.colors.dark[8]
              : theme.colors.gray[0],
        },
      })}
      {...others}
    >
      <Group>
        <Avatar src={image} radius="xl" />

        <div style={{ flex: 1 }} className="hidden">
          <Text size="sm" weight={500}>
            {name}
          </Text>

          <Text color="dimmed" size="xs">
            {email}
          </Text>
        </div>

        {icon || <ChevronRightIcon height={16} />}
      </Group>
    </UnstyledButton>
  )
)

UserButton.displayName = 'UserButton'

function GroupButton() {
  const user = useSession()?.data?.user

  return (
    <Group position="center">
      <Menu withArrow>
        <Menu.Target>
          <UserButton
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

export function UserAccountNav() {
  return <GroupButton />
}
