import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTrack } from '@/lib/track'
import { SetupStatusPill } from './SetupStepHeader'

export interface SetupProgressStep {
  title: string
  description: string
  progress?: SetupStepProgressState
}

export interface SetupStepProgressState {
  label: string
  detail: string
  completedCount: number
  totalCount: number
  isComplete: boolean
  needsAttention: boolean
}

interface SetupProgressShellProps {
  activeStep: number
  className?: string
  isSetupComplete?: boolean
  steps: SetupProgressStep[]
  onStepChange: (step: number) => void
}

type StepState = 'attention' | 'complete' | 'current' | 'upcoming'

const stepStateClasses: Record<StepState, string> = {
  attention:
    'border-amber-700/40 bg-amber-950/20 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]',
  complete:
    'border-emerald-700/40 bg-emerald-950/30 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]',
  current:
    'border-violet-600/50 bg-violet-950/40 text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.14)]',
  upcoming:
    'border-gray-800 bg-gray-950/60 text-gray-300 hover:border-gray-700 hover:bg-gray-950/80',
}

const stepIconClasses: Record<StepState, string> = {
  attention: 'border-amber-600/40 bg-amber-950/70 text-amber-200',
  complete: 'border-emerald-600/40 bg-emerald-950/70 text-emerald-300',
  current: 'border-violet-500/50 bg-violet-950/70 text-violet-200',
  upcoming: 'border-gray-700 bg-gray-900 text-gray-500',
}

function getStepState(
  index: number,
  activeStep: number,
  isSetupComplete: boolean,
  progress?: SetupStepProgressState,
): StepState {
  if (isSetupComplete) {
    return 'complete'
  }

  if (index > activeStep) {
    return 'upcoming'
  }

  if (index === activeStep) {
    return progress?.needsAttention ? 'attention' : 'current'
  }

  if (progress?.isComplete) {
    return 'complete'
  }

  return 'attention'
}

export function SetupProgressShell({
  activeStep,
  className,
  isSetupComplete = false,
  steps,
  onStepChange,
}: SetupProgressShellProps) {
  const track = useTrack()
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)
  const [showCompletionSweep, setShowCompletionSweep] = useState(false)
  const [showFinalStepArrival, setShowFinalStepArrival] = useState(false)
  const stepCount = steps.length
  const isFinalStep = activeStep === stepCount - 1

  useEffect(() => {
    if (!isSetupComplete) {
      setShowCompletionSweep(false)
      return
    }

    setShowCompletionSweep(true)
    const timeout = setTimeout(() => {
      setShowCompletionSweep(false)
    }, 1400)

    return () => clearTimeout(timeout)
  }, [isSetupComplete])

  useEffect(() => {
    if (!isFinalStep || isSetupComplete) {
      setShowFinalStepArrival(false)
      return
    }

    setShowFinalStepArrival(true)
    const timeout = setTimeout(() => {
      setShowFinalStepArrival(false)
    }, 2200)

    return () => clearTimeout(timeout)
  }, [isFinalStep, isSetupComplete])

  const completedCheckCount = steps.reduce((count, step) => {
    if (!step.progress) {
      return count
    }

    return count + step.progress.completedCount
  }, 0)
  const attentionCount = steps.filter(
    (step, index) => index <= activeStep && step.progress?.needsAttention,
  ).length
  const upcomingCount = Math.max(stepCount - activeStep - 1, 0)
  const progressPercent = isSetupComplete
    ? 100
    : stepCount > 0
      ? ((activeStep + 1) / stepCount) * 100
      : 0
  const activeStepData = steps[activeStep]
  const activeProgress = activeStepData?.progress

  const handleStepClick = (stepIndex: number) => {
    track('setup/progress_step_clicked', { from: activeStep, to: stepIndex })
    onStepChange(stepIndex)
  }

  const handleMobileToggle = () => {
    const nextExpandedState = !isMobileExpanded
    setIsMobileExpanded(nextExpandedState)
    track('setup/progress_details_toggled', { expanded: nextExpandedState })
  }

  return (
    <section
      className={clsx(
        'mb-8 rounded-3xl border border-gray-800 bg-black/40 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] md:p-6',
        className,
      )}
    >
      <div
        className={clsx(
          'relative overflow-hidden rounded-[1.35rem] border bg-gray-950/80 p-4 md:p-5 transition-all duration-500',
          isFinalStep && !isSetupComplete
            ? 'border-violet-600/40 shadow-[0_0_0_1px_rgba(139,92,246,0.1),0_18px_70px_rgba(76,29,149,0.22)]'
            : 'border-gray-800/80',
        )}
      >
        <div className='pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(139,92,246,0.12),transparent)]' />
        {isFinalStep && !isSetupComplete && (
          <>
            <motion.div
              aria-hidden='true'
              animate={{ opacity: [0.18, 0.33, 0.18], scale: [0.98, 1.02, 0.99] }}
              className='pointer-events-none absolute inset-x-[14%] top-[-22%] h-44 rounded-full bg-violet-500/18 blur-3xl'
              transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            />
            <AnimatePresence>
              {showFinalStepArrival && (
                <motion.div
                  aria-hidden='true'
                  className='pointer-events-none absolute inset-0'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <motion.div
                    className='absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full border border-violet-400/35'
                    initial={{ opacity: 0.8, scale: 0.65 }}
                    animate={{ opacity: 0, scale: 1.7 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.6, ease: 'easeOut' }}
                  />
                  <motion.div
                    className='absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full border border-fuchsia-300/18'
                    initial={{ opacity: 0.5, scale: 0.55 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.9, ease: 'easeOut', delay: 0.08 }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        <AnimatePresence>
          {showCompletionSweep && (
            <motion.div
              initial={{ opacity: 0, x: '-40%' }}
              animate={{ opacity: [0, 1, 0.75, 0], x: '140%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.15, ease: 'easeInOut' }}
              className='pointer-events-none absolute inset-y-0 left-[-20%] w-1/2 bg-[linear-gradient(90deg,transparent,rgba(167,243,208,0.08),rgba(167,139,250,0.18),rgba(196,181,253,0.12),transparent)] blur-2xl'
            />
          )}
        </AnimatePresence>

        <div className='relative'>
          <div className='mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-500'>
                  Setup journey
                </p>
                {isFinalStep && !isSetupComplete && (
                  <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    className='inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-950/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200'
                    transition={{
                      duration: 1.8,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                  >
                    <span className='relative flex h-2 w-2'>
                      <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-300/70' />
                      <span className='relative inline-flex h-2 w-2 rounded-full bg-violet-200' />
                    </span>
                    Final step
                  </motion.div>
                )}
              </div>
              <div>
                <h2 className='text-2xl font-semibold text-white md:text-[2rem]'>
                  {isSetupComplete
                    ? 'Setup complete'
                    : isFinalStep
                      ? 'Final step — connect Steam'
                      : `Step ${activeStep + 1} of ${stepCount}`}
                </h2>
                <p className='mt-1 max-w-2xl text-sm leading-relaxed text-gray-400 md:text-base'>
                  {isSetupComplete
                    ? 'All systems are ready. Dotabod is connected, your overlay is set, and you can jump straight into features.'
                    : isFinalStep
                      ? 'Everything else is in place. One quick in-game check links Steam and activates full match tracking.'
                      : (activeProgress?.detail ?? activeStepData?.description)}
                </p>
              </div>
            </div>

            <div className='flex flex-wrap gap-2'>
              <SetupStatusPill tone='success'>
                {completedCheckCount} checks completed
              </SetupStatusPill>
              <SetupStatusPill
                tone={
                  isSetupComplete
                    ? 'success'
                    : activeProgress?.needsAttention
                      ? 'warning'
                      : activeProgress?.isComplete
                        ? 'success'
                        : 'info'
                }
              >
                {isSetupComplete
                  ? 'All systems ready'
                  : (activeProgress?.label ?? `${activeStepData?.title ?? 'Current'} in progress`)}
              </SetupStatusPill>
              {!isSetupComplete && attentionCount > 0 ? (
                <SetupStatusPill tone='warning'>{attentionCount} need attention</SetupStatusPill>
              ) : (
                <SetupStatusPill tone={upcomingCount > 0 ? 'neutral' : 'success'}>
                  {isSetupComplete ? 'Ready to explore' : `${upcomingCount} upcoming`}
                </SetupStatusPill>
              )}
            </div>
          </div>

          <div
            aria-label='Setup progress'
            aria-valuemax={stepCount}
            aria-valuemin={1}
            aria-valuenow={activeStep + 1}
            className='mb-4 hidden md:block'
            role='progressbar'
          >
            <div className='mb-5 h-1.5 overflow-hidden rounded-full bg-gray-900'>
              <div
                className={clsx(
                  'h-full rounded-full transition-[width] duration-300 ease-out',
                  isFinalStep && !isSetupComplete
                    ? 'bg-[linear-gradient(90deg,rgba(16,185,129,0.78)_0%,rgba(139,92,246,0.95)_58%,rgba(236,72,153,0.92)_100%)] shadow-[0_0_28px_rgba(139,92,246,0.28)]'
                    : 'bg-[linear-gradient(90deg,rgba(16,185,129,0.82)_0%,rgba(139,92,246,0.78)_72%,rgba(167,139,250,0.9)_100%)]',
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className='grid gap-3 md:grid-cols-4'>
              {steps.map((step, index) => {
                const state = getStepState(index, activeStep, isSetupComplete, step.progress)
                const isCurrent = state === 'current'

                return (
                  <button
                    key={step.title}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={clsx(
                      'group rounded-2xl border p-4 text-left transition-all duration-200 ease-out',
                      stepStateClasses[state],
                    )}
                    onClick={() => handleStepClick(index)}
                    type='button'
                  >
                    <div className='mb-3 flex items-center justify-between gap-3'>
                      <div
                        className={clsx(
                          'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                          stepIconClasses[state],
                        )}
                      >
                        {state === 'complete' ? (
                          <CheckCircle2 size={16} strokeWidth={2.4} />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <span className='text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500 transition-colors group-hover:text-gray-400'>
                        {step.progress?.label ??
                          (state === 'complete'
                            ? 'Complete'
                            : state === 'attention'
                              ? 'Needs attention'
                              : isCurrent
                                ? 'Current'
                                : 'Upcoming')}
                      </span>
                    </div>

                    <div>
                      <h3 className='text-base font-semibold text-white'>{step.title}</h3>
                      <p className='mt-1 text-sm leading-relaxed text-gray-400'>
                        {step.progress?.detail ?? step.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className='md:hidden'>
            <div className='mb-3 grid grid-cols-4 gap-2'>
              {steps.map((step, index) => {
                const state = getStepState(index, activeStep, isSetupComplete, step.progress)

                return (
                  <button
                    key={step.title}
                    aria-current={state === 'current' ? 'step' : undefined}
                    className={clsx(
                      'rounded-2xl border px-3 py-2 text-left transition-colors duration-200',
                      stepStateClasses[state],
                    )}
                    onClick={() => handleStepClick(index)}
                    type='button'
                  >
                    <div className='mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500'>
                      {index + 1}
                    </div>
                    <div className='truncate text-sm font-semibold text-white'>{step.title}</div>
                  </button>
                )
              })}
            </div>

            <button
              aria-expanded={isMobileExpanded}
              className='flex w-full items-center justify-between rounded-2xl border border-gray-800 bg-gray-950/70 px-4 py-3 text-left'
              onClick={handleMobileToggle}
              type='button'
            >
              <div>
                <p className='text-sm font-semibold text-white'>{activeStepData?.title}</p>
                <p className='mt-0.5 text-xs text-gray-500'>
                  {activeProgress?.label ?? 'Tap to review all setup steps'}
                </p>
              </div>
              {isMobileExpanded ? (
                <ChevronUp className='text-gray-400' size={18} />
              ) : (
                <ChevronDown className='text-gray-400' size={18} />
              )}
            </button>

            {isMobileExpanded && (
              <div className='mt-3 space-y-2'>
                {steps.map((step, index) => {
                  const state = getStepState(index, activeStep, isSetupComplete, step.progress)

                  return (
                    <button
                      key={`${step.title}-mobile`}
                      className={clsx(
                        'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors duration-200',
                        stepStateClasses[state],
                      )}
                      onClick={() => handleStepClick(index)}
                      type='button'
                    >
                      <div
                        className={clsx(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                          stepIconClasses[state],
                        )}
                      >
                        {state === 'complete' ? (
                          <CheckCircle2 size={15} strokeWidth={2.4} />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <div>
                        <p className='text-sm font-semibold text-white'>{step.title}</p>
                        <p className='mt-1 text-xs leading-relaxed text-gray-400'>
                          {step.progress?.detail ?? step.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
