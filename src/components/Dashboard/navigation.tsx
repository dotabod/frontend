import { Github, LogOut } from 'lucide-react'
import {
  BeakerIcon,
  BoltIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import DiscordSvg from '@/images/logos/discord.svg'
import clsx from 'clsx'
import { signOut } from 'next-auth/react'

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
    icon: (props) => (
      <VideoCameraIcon
        {...props}
        className={clsx(props.className, 'text-red-400')}
      />
    ),
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
    icon: ({ ...props }) => <Image alt="discord" src={DiscordSvg} {...props} />,
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
