import clsx from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'success' | 'info' | 'warning' | 'error' | 'neutral'

const toneClasses: Record<Tone, { container: string; icon: string }> = {
  success: {
    container: 'border-emerald-800 bg-emerald-950/40 text-emerald-200',
    icon: 'text-emerald-400',
  },
  info: {
    container: 'border-indigo-800 bg-indigo-950/40 text-indigo-200',
    icon: 'text-indigo-400',
  },
  warning: {
    container: 'border-amber-800 bg-amber-950/40 text-amber-200',
    icon: 'text-amber-400',
  },
  error: {
    container: 'border-red-800 bg-red-950/40 text-red-200',
    icon: 'text-red-400',
  },
  neutral: {
    container: 'border-gray-700 bg-gray-800/40 text-gray-300',
    icon: 'text-gray-400',
  },
}

interface BillingNoticeProps {
  tone?: Tone
  icon?: ReactNode
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}

// One inline callout language for the billing page: a full 1px border, a tinted
// surface, and a leading icon. No side stripes, no 2px borders, no AntD skin.
export function BillingNotice({
  tone = 'neutral',
  icon,
  title,
  children,
  action,
  className,
}: BillingNoticeProps) {
  const t = toneClasses[tone]
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={clsx(
        'flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-start sm:justify-between',
        t.container,
        className,
      )}
    >
      <div className='flex items-start gap-3'>
        {icon && <span className={clsx('mt-0.5 shrink-0', t.icon)}>{icon}</span>}
        <div className='space-y-1'>
          <div className='text-sm font-medium'>{title}</div>
          {children && <div className='text-sm leading-6 opacity-90'>{children}</div>}
        </div>
      </div>
      {action && <div className='shrink-0 sm:pl-4'>{action}</div>}
    </div>
  )
}
