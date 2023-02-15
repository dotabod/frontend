import { Github, LogOut } from 'lucide-react'
import {
  BeakerIcon,
  SparklesIcon,
  CommandLineIcon,
  HeartIcon,
  QuestionMarkCircleIcon,
  RssIcon,
} from '@heroicons/react/24/outline'
import { signOut } from 'next-auth/react'
import Discord from '@/images/logos/Discord'
import KofiIcon from '@/images/logos/Kofi'
import Image from 'next/image'
import BoostyLogo from '@/images/logos/BoostyIcon.png'
import React from 'react'
import clsx from 'clsx'

export const navigation = [
  {
    name: 'Setup',
    href: '/dashboard',
    icon: BeakerIcon,
  },
  {
    name: 'Features',
    href: '/dashboard/features',
    icon: SparklesIcon,
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
    key: 'donate',
    icon: ({ className }) => (
      <HeartIcon
        className={clsx('h-4 w-4 !text-red-500', className)}
        aria-hidden="true"
      />
    ),
    children: [
      {
        key: 'kofi',
        label: (
          <a href="https://ko-fi.com/dotabod" target="_blank" rel="noreferrer">
            Ko-fi
          </a>
        ),
        icon: <KofiIcon className="h-4 w-4" />,
      },
      {
        label: (
          <a href="https://boosty.to/dotabod" target="_blank" rel="noreferrer">
            Boosty
          </a>
        ),
        key: 'boosty',
        href: 'https://boosty.to/dotabod',
        icon: <Image src={BoostyLogo} height={16} width={16} alt="boosty" />,
      },
    ],
  },
  {
    name: 'Changelog',
    href: 'https://discord.com/channels/1039887907705593876/1069124160179163146',
    icon: RssIcon,
  },
  {
    name: '',
    href: '',
    icon: null,
  },
  {
    name: 'Sign out',
    href: '#',
    onClick: () => {
      signOut({
        callbackUrl: `${window.location.origin}/`,
      })
    },
    icon: LogOut,
  },
  {
    name: '',
    href: '',
    icon: null,
  },
]
