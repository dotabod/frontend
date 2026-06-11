import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { Button, Popover } from 'antd'
import Link from 'next/link'
import { isExternalNavItem, navConfig } from './navigation'

interface HelpMenuProps {
  /** When the trigger lives in a collapsed sidebar rail, open to the side instead. */
  collapsed?: boolean
  /** Called after a link is clicked — used to close the mobile drawer. */
  onNavigate?: () => void
}

// "?" popover holding help + external resources. Replaces the five old sidebar
// "Help" rows; everything stays one click away without bloating the rail.
export function HelpMenu({ collapsed = false, onNavigate }: HelpMenuProps) {
  const content = (
    <div className='flex w-48 flex-col'>
      {navConfig.help.map((item) => {
        const external = isExternalNavItem(item)

        return (
          <Link
            key={item.href}
            href={item.href ?? '#'}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            onClick={onNavigate}
            className='flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-200! transition-colors hover:bg-gray-700'
          >
            {item.icon && <item.icon className='h-4 w-4' aria-hidden={true} />}
            <span>{item.name}</span>
          </Link>
        )
      })}

      <div className='my-1 border-t border-gray-700' />

      <div className='px-3 py-2 text-xs text-gray-400'>
        Press{' '}
        <kbd className='rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 font-mono text-xs'>
          ⌘K
        </kbd>{' '}
        to search
      </div>
    </div>
  )

  return (
    <Popover
      content={content}
      trigger='click'
      placement={collapsed ? 'right' : 'bottomRight'}
      arrow={false}
    >
      <Button
        type='text'
        aria-label='Help and resources'
        icon={<QuestionMarkCircleIcon className='h-5 w-5 text-gray-200' />}
      />
    </Popover>
  )
}
