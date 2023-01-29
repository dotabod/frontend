import { Github, LogOut } from 'lucide-react'
import {
  BeakerIcon,
  BoltIcon,
  CommandLineIcon,
  HeartIcon,
  QuestionMarkCircleIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { signOut } from 'next-auth/react'
import Discord from '@/images/logos/Discord'

export const navigation = [
  {
    name: 'Setup',
    href: '/dashboard',
    icon: BeakerIcon,
  },
  {
    name: 'Features',
    href: '/dashboard/features',
    icon: BoltIcon,
  },
  {
    name: 'Commands',
    href: '/dashboard/commands',
    icon: CommandLineIcon,
  },
  {
    name: 'Troubleshoot',
    href: '/dashboard/troubleshoot',
    icon: QuestionMarkCircleIcon,
  },
  {
    name: 'Live preview',
    href: '/overlay/',
    icon: VideoCameraIcon,
  },
  {
    name: '',
    href: '',
    icon: null,
  },
  {
    name: 'Github',
    href: 'https://github.com/dotabod/',
    icon: Github,
  },
  {
    name: 'Discord',
    href: 'https://discord.dotabod.com',
    icon: Discord,
  },
  {
    name: 'Support the project',
    href: 'https://ko-fi.com/dotabod',
    icon: ({ ...props }) => (
      <HeartIcon
        {...props}
        className={clsx(props.className, '!text-red-500')}
      />
    ),
  },
  {
    name: '',
    href: '',
    icon: null,
  },
  {
    name: 'Sign out',
    href: '#',
    onClick: async (e) => {
      e.preventDefault()
      await signOut({
        callbackUrl: `${window.location.origin}/`,
      })
    },
    icon: LogOut,
  },
]
