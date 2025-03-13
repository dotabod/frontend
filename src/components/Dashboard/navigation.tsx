import Discord from '@/images/logos/Discord'
import { BeakerIcon, QuestionMarkCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import {
  Cookie,
  DollarSignIcon,
  Gift,
  Github,
  HardDriveIcon,
  Info,
  NewspaperIcon,
  ShieldCheck,
} from 'lucide-react'

// Add a const for parent keys
export const PARENT_KEYS = {
  ADMIN: 'admin-menu',
  FEATURES: 'features-menu',
  BOT_SETTINGS: 'bot-settings-menu',
  ACCOUNT: 'account-menu',
  HELP: 'help-menu',
  LEGAL: 'legal-menu',
} as const

export const navigation = [
  // Admin only
  {
    name: 'Admin',
    key: PARENT_KEYS.ADMIN,
    icon: ShieldCheck,
    children: [
      { name: 'Scheduled Messages', href: '/dashboard/admin' },
      { name: 'Manage Channel', href: '/dashboard/admin/manage-channel' },
      { name: 'Test Gift', href: '/dashboard/admin/test-gift' },
    ],
  },

  // Main features
  {
    name: 'Setup',
    href: '/dashboard',
    icon: BeakerIcon,
  },
  {
    name: 'Features',
    key: PARENT_KEYS.FEATURES,
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
    key: PARENT_KEYS.BOT_SETTINGS,
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
    key: PARENT_KEYS.ACCOUNT,
    icon: ShieldCheck,
    new: true,
    children: [
      {
        name: 'Billing',
        href: '/dashboard/billing',
        icon: DollarSignIcon,
      },
      {
        name: 'Gift Pro',
        href: '/gift',
        icon: Gift,
        new: true,
      },
      {
        name: 'Data',
        href: '/dashboard/data',
        icon: HardDriveIcon,
      },
    ],
  },

  // Help & Resources
  {
    name: 'Help & Resources',
    key: PARENT_KEYS.HELP,
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
        name: 'Blog',
        href: '/blog',
        icon: NewspaperIcon,
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
    key: PARENT_KEYS.LEGAL,
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
