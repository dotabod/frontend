import clsx from 'clsx'

interface SetupStepHeaderProps {
  step: number
  title: string
  subtitle: string
}

interface SetupStepPanelProps {
  eyebrow?: string
  title: string
  description?: string
  status?: React.ReactNode
  children: React.ReactNode
  className?: string
}

interface SetupStatusPillProps {
  tone?: 'info' | 'success' | 'warning' | 'neutral'
  children: React.ReactNode
}

const statusToneClasses: Record<NonNullable<SetupStatusPillProps['tone']>, string> = {
  info: 'border-violet-700/40 bg-violet-950/40 text-violet-300',
  success: 'border-emerald-700/40 bg-emerald-950/50 text-emerald-300',
  warning: 'border-amber-700/40 bg-amber-950/50 text-amber-300',
  neutral: 'border-gray-700 bg-gray-800/80 text-gray-300',
}

export function SetupStepHeader({ step, title, subtitle }: SetupStepHeaderProps) {
  return (
    <div className='relative px-6 pt-8 pb-7 border-b border-gray-800'>
      <div className='pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(139,92,246,0.08),transparent)]' />
      <div className='relative flex flex-col items-center text-center gap-2'>
        <div className='inline-flex items-center rounded-full bg-violet-950/40 border border-violet-700/40 px-3 py-1 text-xs font-medium text-violet-400'>
          Step {step}
        </div>
        <h2 className='text-xl font-bold text-white'>{title}</h2>
        <p className='text-gray-400 max-w-lg text-sm leading-relaxed'>{subtitle}</p>
      </div>
    </div>
  )
}

export function SetupStatusPill({ tone = 'info', children }: SetupStatusPillProps) {
  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        statusToneClasses[tone],
      )}
    >
      {children}
    </div>
  )
}

export function SetupStepPanel({
  eyebrow,
  title,
  description,
  status,
  children,
  className,
}: SetupStepPanelProps) {
  return (
    <section
      className={clsx(
        'rounded-2xl border border-gray-800 bg-gray-950/50 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]',
        className,
      )}
    >
      <div className='mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-1'>
          {eyebrow && (
            <p className='text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500'>
              {eyebrow}
            </p>
          )}
          <h3 className='text-lg font-semibold text-white'>{title}</h3>
          {description && (
            <p className='max-w-2xl text-sm leading-relaxed text-gray-400'>{description}</p>
          )}
        </div>
        {status && <div className='shrink-0'>{status}</div>}
      </div>

      {children}
    </section>
  )
}
