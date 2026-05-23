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
import Discord from '@/images/logos/Discord'

// Add a const for parent keys
const PARENT_KEYS = {
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
    hideForImpersonator: true,
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
    hideForImpersonator: true,
  },
  {
    name: 'Features',
    key: PARENT_KEYS.FEATURES,
    icon: SparklesIcon,
    children: [
      {
        name: 'Overview',
        href: '/dashboard/features',
      },
      {
        name: 'Stream overlay',
        href: '/dashboard/features/overlay',
      },
      {
        name: 'Chat features',
        href: '/dashboard/features/chat',
      },
      {
        name: 'Notable players',
        href: '/dashboard/notable-players',
      },
      {
        name: 'Advanced',
        href: '/dashboard/features/advanced',
      },
    ],
  },
  {
    name: 'Bot & team',
    key: PARENT_KEYS.BOT_SETTINGS,
    icon: SparklesIcon,
    children: [
      {
        name: 'Chat commands',
        href: '/dashboard/commands',
      },
      {
        name: 'Team access',
        href: '/dashboard/managers',
        hideForImpersonator: true,
      },
    ],
  },

  // Account & Support
  {
    name: 'Account',
    key: PARENT_KEYS.ACCOUNT,
    icon: ShieldCheck,
    hideForImpersonator: true,
    children: [
      {
        name: 'Billing',
        href: '/dashboard/billing',
        icon: DollarSignIcon,
        hideForImpersonator: true,
      },
      {
        name: 'Gift a subscription',
        href: '/gift',
        icon: Gift,
      },
      {
        name: 'Your data',
        href: '/dashboard/data',
        icon: HardDriveIcon,
        hideForImpersonator: true,
      },
    ],
  },

  // Help & Resources
  {
    name: 'Help',
    key: PARENT_KEYS.HELP,
    icon: QuestionMarkCircleIcon,
    children: [
      {
        name: 'Help center',
        href: '/dashboard/help',
        icon: QuestionMarkCircleIcon,
      },
      {
        name: 'Discord community',
        href: 'https://discord.dotabod.com',
        icon: Discord,
      },
      {
        name: 'GitHub',
        href: 'https://github.com/dotabod/',
        icon: Github,
      },
      {
        name: 'Blog',
        href: '/blog',
        icon: NewspaperIcon,
      },
      {
        name: 'Service status',
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
