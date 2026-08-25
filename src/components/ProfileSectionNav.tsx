import Link from 'next/link'
import { Container } from '@/components/Container'

type ProfileSection = 'collection' | 'matches'

interface ProfileSectionNavProps {
  current: ProfileSection
  username: string
}

const sections: Array<{ href: 'matches' | 'set'; label: string; section: ProfileSection }> = [
  { href: 'matches', label: 'Match history', section: 'matches' },
  { href: 'set', label: 'Cosmetic collection', section: 'collection' },
]

export function ProfileSectionNav({ current, username }: ProfileSectionNavProps) {
  return (
    <div className='border-b border-gray-800 bg-gray-950 font-sans'>
      <Container>
        <nav aria-label='Profile sections' className='flex overflow-x-auto'>
          {sections.map((item) => {
            const active = item.section === current
            return (
              <Link
                key={item.section}
                href={`/${username}/${item.href}`}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors first:pl-0 last:pr-0 focus-visible:rounded-sm focus-visible:outline-2! focus-visible:outline-offset-2 focus-visible:outline-purple-400 sm:px-4 ${
                  active
                    ? 'border-purple-500 text-purple-200!'
                    : 'border-transparent text-gray-400! hover:border-gray-700 hover:text-gray-200!'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </Container>
    </div>
  )
}
