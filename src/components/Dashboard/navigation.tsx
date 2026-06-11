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
  ACCOUNT: 'account-menu',
  ADMIN: 'admin-menu',
  BOT_SETTINGS: 'bot-settings-menu',
  FEATURES: 'features-menu',
  HELP: 'help-menu',
  LEGAL: 'legal-menu',
} as const

export const navigation = [
  // Admin only
  {
    children: [
      { href: '/dashboard/admin', name: 'Scheduled Messages' },
      { href: '/dashboard/admin/manage-channel', name: 'Manage Channel' },
      { href: '/dashboard/admin/test-gift', name: 'Test Gift' },
    ],
    hideForImpersonator: true,
    icon: ShieldCheck,
    key: PARENT_KEYS.ADMIN,
    name: 'Admin',
  },

  // Main features
  {
    hideForImpersonator: true,
    href: '/dashboard',
    icon: BeakerIcon,
    name: 'Setup',
  },
  {
    children: [
      {
        href: '/dashboard/whats-new',
        name: "What's New",
      },
      {
        href: '/dashboard/features',
        name: 'Overview',
      },
      {
        href: '/dashboard/features/overlay',
        name: 'Stream overlay',
      },
      {
        href: '/dashboard/features/chat',
        name: 'Chat features',
      },
      {
        href: '/dashboard/notable-players',
        name: 'Notable players',
      },
      {
        href: '/dashboard/features/advanced',
        name: 'Advanced',
      },
    ],
    icon: SparklesIcon,
    key: PARENT_KEYS.FEATURES,
    name: 'Features',
  },
  {
    children: [
      {
        href: '/dashboard/commands',
        name: 'Chat commands',
      },
      {
        hideForImpersonator: true,
        href: '/dashboard/managers',
        name: 'Team access',
      },
    ],
    icon: SparklesIcon,
    key: PARENT_KEYS.BOT_SETTINGS,
    name: 'Bot & team',
  },

  // Account & Support
  {
    children: [
      {
        hideForImpersonator: true,
        href: '/dashboard/billing',
        icon: DollarSignIcon,
        name: 'Billing',
      },
      {
        href: '/gift',
        icon: Gift,
        name: 'Gift a subscription',
      },
      {
        hideForImpersonator: true,
        href: '/dashboard/data',
        icon: HardDriveIcon,
        name: 'Your data',
      },
    ],
    hideForImpersonator: true,
    icon: ShieldCheck,
    key: PARENT_KEYS.ACCOUNT,
    name: 'Account',
  },

  // Help & Resources
  {
    children: [
      {
        href: '/dashboard/help',
        icon: QuestionMarkCircleIcon,
        name: 'Help center',
      },
      {
        href: 'https://discord.dotabod.com',
        icon: Discord,
        name: 'Discord community',
      },
      {
        href: 'https://github.com/dotabod/',
        icon: Github,
        name: 'GitHub',
      },
      {
        href: '/blog',
        icon: NewspaperIcon,
        name: 'Blog',
      },
      {
        href: 'https://status.dotabod.com',
        icon: Info,
        name: 'Service status',
      },
    ],
    icon: QuestionMarkCircleIcon,
    key: PARENT_KEYS.HELP,
    name: 'Help',
  },

  // Legal
  {
    children: [
      {
        href: '/privacy-policy',
        icon: ShieldCheck,
        name: 'Privacy Policy',
      },
      {
        href: '/terms-of-service',
        icon: ShieldCheck,
        name: 'Terms of Service',
      },
      {
        href: '/cookies',
        icon: Cookie,
        name: 'Cookie Policy',
      },
    ],
    icon: ShieldCheck,
    key: PARENT_KEYS.LEGAL,
    name: 'Legal',
  },
]
