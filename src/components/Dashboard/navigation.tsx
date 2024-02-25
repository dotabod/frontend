import { Github, Info } from 'lucide-react'
import {
  BeakerIcon,
  SparklesIcon,
  CommandLineIcon,
  HeartIcon,
  QuestionMarkCircleIcon,
  RssIcon,
  GlobeEuropeAfricaIcon,
  MegaphoneIcon,
  ScaleIcon,
  TvIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
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
    children: [
      {
        name: 'Main',
        href: '/dashboard/features',
        icon: GlobeEuropeAfricaIcon,
      },
      {
        name: 'Overlay',
        href: '/dashboard/features/overlay',
        icon: TvIcon,
      },
      {
        name: 'Chat',
        href: '/dashboard/features/chat',
        icon: MegaphoneIcon,
      },
      {
        name: 'Advanced',
        href: '/dashboard/features/advanced',
        icon: ScaleIcon,
      },
    ],
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
    name: 'Socials',
    icon: ShareIcon,
    children: [
      {
        name: 'Status',
        href: 'https://status.dotabod.com',
        icon: Info,
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
    ],
  },
  {
    name: 'Support the project',
    icon: ({ className }) => (
      <HeartIcon
        className={clsx('h-4 w-4 !text-red-500', className)}
        aria-hidden="true"
      />
    ),
    children: [
      {
        name: 'Ko-fi',
        href: 'https://ko-fi.com/dotabod',
        icon: KofiIcon,
      },
      {
        name: 'Boosty',
        href: 'https://boosty.to/dotabod',
        icon: ({ className }) => (
          <Image
            src={BoostyLogo}
            height={16}
            width={16}
            alt="boosty"
            className={className}
          />
        ),
      },
    ],
  },
  {
    name: 'Changelog',
    href: 'https://discord.com/channels/1039887907705593876/1069124160179163146',
    icon: RssIcon,
  },
]
