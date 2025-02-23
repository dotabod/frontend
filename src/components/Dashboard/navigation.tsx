import Discord from '@/images/logos/Discord'
import { BeakerIcon, QuestionMarkCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Cookie, DollarSignIcon, Github, HardDriveIcon, Info, ShieldCheck } from 'lucide-react'

export const navigation = [
  // Main features
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
      },
      {
        name: 'Overlay',
        href: '/dashboard/features/overlay',
      },
      {
        name: 'Chat',
        href: '/dashboard/features/chat',
      },
      {
        name: 'Advanced',
        href: '/dashboard/features/advanced',
      },
    ],
  },
  {
    name: 'Bot Settings',
    icon: SparklesIcon,
    children: [
      {
        name: 'Commands',
        href: '/dashboard/commands',
      },
      {
        name: 'Managers',
        href: '/dashboard/managers',
      },
    ],
  },

  // Account & Support
  {
    name: 'Account',
    icon: ShieldCheck,
    new: true,
    children: [
      {
        name: 'Billing',
        href: '/dashboard/billing',
        icon: DollarSignIcon,
        new: true,
      },
      {
        name: 'Data',
        href: '/dashboard/data',
        icon: HardDriveIcon,
        new: true,
      },
    ],
  },

  // Help & Resources
  {
    name: 'Help & Resources',
    icon: QuestionMarkCircleIcon,
    children: [
      {
        name: 'Help',
        href: '/dashboard/troubleshoot',
        icon: QuestionMarkCircleIcon,
      },
      {
        name: 'Discord',
        href: 'https://discord.dotabod.com',
        icon: Discord,
      },
      {
        name: 'Github',
        href: 'https://github.com/dotabod/',
        icon: Github,
      },
      {
        name: 'Status',
        href: 'https://status.dotabod.com',
        icon: Info,
      },
    ],
  },

  // Legal
  {
    name: 'Legal',
    icon: ShieldCheck,
    children: [
      {
        name: 'Privacy Policy',
        href: '/privacy-policy',
        icon: ShieldCheck,
      },
      {
        name: 'Terms of Service',
        href: '/terms-of-service',
        icon: ShieldCheck,
      },
      {
        name: 'Cookie Policy',
        href: '/cookies',
        icon: Cookie,
      },
    ],
  },
]
