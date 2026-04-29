import { Button, Collapse, Tag } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Clock4, WifiOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { STEAM_CONNECTION_MESSAGES } from '@/lib/steamConnectionMessages'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import type { SetupStepProgressState } from './SetupProgressShell'

interface SteamConnectStepProps {
  isLive: boolean
  onProgressChange?: (progress: SetupStepProgressState) => void
}

const STEP_PILLS = [
  { label: 'Stream', done: true },
  { label: 'Dota 2', done: true },
  { label: 'OBS', done: true },
  { label: 'Steam', done: false },
] as const

export function SteamConnectStep({ isLive, onProgressChange }: SteamConnectStepProps) {
  const track = useTrack()
  const [launched, setLaunched] = useState(false)

  // Poll for Steam link after the user clicks Launch — stops once linked
  const { data: linkedData } = useSWR(launched ? '/api/steam/get-linked-account' : null, fetcher, {
    refreshInterval: (data) => (data?.linked ? 0 : 4000),
  })
  const isLinked = linkedData?.linked === true
  const linkedName = linkedData?.primaryAccount?.profileData?.name
  const showFinalStepPulse = !isLinked

  useEffect(() => {
    const progress: SetupStepProgressState = isLinked
      ? {
          label: 'Steam connected',
          detail: `Dotabod is ready to track matches${linkedName ? ` for ${linkedName}` : ''}.`,
          completedCount: 2,
          totalCount: 2,
          isComplete: true,
          needsAttention: false,
        }
      : !isLive
        ? {
            label: 'Go live to connect',
            detail: 'Steam only links while your Twitch stream is live.',
            completedCount: 0,
            totalCount: 2,
            isComplete: false,
            needsAttention: true,
          }
        : launched
          ? {
              label: 'Waiting for Steam connection',
              detail: 'Open Dota 2 and demo a hero or play a match to finish linking.',
              completedCount: 1,
              totalCount: 2,
              isComplete: false,
              needsAttention: false,
            }
          : {
              label: 'Launch Dota 2 to connect',
              detail:
                'Technical setup is done — one quick in-game check will finish Steam linking.',
              completedCount: 0,
              totalCount: 2,
              isComplete: false,
              needsAttention: false,
            }

    onProgressChange?.(progress)
  }, [isLinked, isLive, launched, linkedName, onProgressChange])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card className='!p-0 overflow-hidden'>
        {/* ── HERO REGION ──────────────────────────────────────────────── */}
        <div className='relative px-6 pt-10 pb-8 border-b border-gray-800'>
          <div className='pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(139,92,246,0.10),transparent)]' />
          {showFinalStepPulse && (
            <>
              <motion.div
                aria-hidden='true'
                animate={{ opacity: [0.16, 0.34, 0.16], scale: [0.92, 1.04, 0.96] }}
                className='pointer-events-none absolute left-1/2 top-8 h-36 w-36 -translate-x-1/2 rounded-full bg-violet-500/15 blur-3xl'
                transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              />
              <motion.div
                aria-hidden='true'
                animate={{ opacity: [0.45, 0, 0.45], scale: [0.72, 1.18, 0.72] }}
                className='pointer-events-none absolute left-1/2 top-9 h-24 w-24 -translate-x-1/2 rounded-full border border-violet-400/30'
                transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' }}
              />
            </>
          )}

          {/* Step progress trail */}
          <div className='relative flex flex-wrap items-center justify-center gap-2 mb-7'>
            {STEP_PILLS.map((step, i) => (
              <div key={step.label} className='flex items-center gap-2'>
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    step.done || isLinked
                      ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-400'
                      : 'bg-violet-950/60 border-violet-600/60 text-violet-300'
                  }`}
                >
                  {step.done || isLinked ? (
                    <CheckCircle2 size={12} strokeWidth={2.5} />
                  ) : (
                    <Clock4 size={12} strokeWidth={2.5} />
                  )}
                  {step.label}
                </div>
                {i < STEP_PILLS.length - 1 && <div className='w-4 h-px bg-gray-700 shrink-0' />}
              </div>
            ))}
          </div>

          {/* Headline */}
          <div className='relative text-center'>
            {!isLinked && (
              <motion.div
                animate={{ y: [0, -2, 0] }}
                className='mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-950/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200'
                transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              >
                <span className='relative flex h-2 w-2'>
                  <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-300/70' />
                  <span className='relative inline-flex h-2 w-2 rounded-full bg-violet-200' />
                </span>
                Final connection check
              </motion.div>
            )}
            <AnimatePresence mode='wait'>
              {isLinked ? (
                <motion.div
                  key='linked'
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className='flex justify-center mb-3'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-full border border-emerald-700/40 bg-emerald-950/50 shadow-[0_0_30px_rgba(16,185,129,0.16)]'>
                      <CheckCircle2 size={26} className='text-emerald-300' strokeWidth={2.4} />
                    </div>
                  </div>
                  <h2 className='text-2xl font-bold text-white mb-2'>
                    Steam connected{linkedName ? ` — ${linkedName}` : ''}!
                  </h2>
                  <p className='text-gray-400 max-w-md mx-auto text-sm leading-relaxed'>
                    You&apos;re all set. Dotabod will now track your matches automatically every
                    time you stream.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key='unlinked'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className='text-2xl font-bold text-white mb-2'>Connect your Steam account</h2>
                  <p className='text-gray-400 max-w-md mx-auto text-sm leading-relaxed'>
                    You made it to the final step. Launch Dota 2, demo any hero, and Dotabod will
                    link Steam automatically — no account details needed.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── PRIMARY ACTION REGION ────────────────────────────────────── */}
        <AnimatePresence mode='wait'>
          {isLinked ? (
            <motion.div
              key='done'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='px-6 py-10 text-center'
            >
              <Link href='/dashboard/features'>
                <Button type='primary' size='large'>
                  Explore your features →
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key='steps'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='px-6 py-8'
            >
              {/* Stream status pill — shown once, calm */}
              <div className='flex justify-center mb-8'>
                {isLive ? (
                  <div className='inline-flex items-center gap-2 rounded-full bg-emerald-950/60 border border-emerald-700/50 px-4 py-1.5 text-sm text-emerald-400'>
                    <span className='relative flex h-2 w-2'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60' />
                      <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500' />
                    </span>
                    Stream is live — ready to connect
                  </div>
                ) : (
                  <div className='inline-flex items-center gap-2 rounded-full bg-amber-950/60 border border-amber-700/50 px-4 py-1.5 text-sm text-amber-400'>
                    <WifiOff size={13} />
                    Go live on Twitch before connecting Steam
                  </div>
                )}
              </div>

              {/* Two-step mini-flow */}
              <div className='max-w-sm mx-auto space-y-4'>
                {/* Step 1 */}
                <div className='flex gap-4 items-start'>
                  <div className='shrink-0 w-7 h-7 rounded-full bg-violet-900/50 border border-violet-700/60 flex items-center justify-center text-violet-300 text-xs font-bold'>
                    1
                  </div>
                  <div className='flex-1 pt-0.5'>
                    <p className='text-sm font-medium text-gray-200 mb-2'>Open Dota 2</p>
                    <Link
                      href='steam://run/570'
                      onClick={() => {
                        track('setup/launch_dota2_clicked')
                        setLaunched(true)
                        setTimeout(() => {
                          if (!document.hidden) {
                            window.open('https://store.steampowered.com/app/570/Dota_2/', '_blank')
                          }
                        }, 500)
                      }}
                    >
                      <Button type='primary' size='middle' className='font-medium!'>
                        Launch Dota 2
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className='ml-3.5 w-px h-4 bg-gray-700' />

                {/* Step 2 */}
                <div className='flex gap-4 items-start'>
                  <div className='shrink-0 w-7 h-7 rounded-full bg-violet-900/50 border border-violet-700/60 flex items-center justify-center text-violet-300 text-xs font-bold'>
                    2
                  </div>
                  <div className='flex-1 pt-0.5'>
                    <p className='text-sm font-medium text-gray-200'>
                      Demo any hero <span className='text-gray-500 font-normal'>or</span> play a
                      match
                    </p>
                    <p className='text-xs text-gray-500 mt-1 leading-relaxed'>
                      In the Dota 2 main menu: <strong className='text-gray-400'>Play</strong> →{' '}
                      <strong className='text-gray-400'>Demo a Hero</strong> — pick any hero, then
                      type <Tag className='text-xs'>!facet</Tag> in your Twitch chat to confirm it
                      works.
                    </p>
                  </div>
                </div>
              </div>

              {/* Waiting indicator — shown after launch clicked */}
              {launched && !isLinked && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='mt-8 flex justify-center'
                >
                  <div className='inline-flex items-center gap-2 text-xs text-gray-500'>
                    <span className='relative flex h-2 w-2'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-40' />
                      <span className='relative inline-flex rounded-full h-2 w-2 bg-violet-500/60' />
                    </span>
                    Waiting for Steam connection…
                  </div>
                </motion.div>
              )}

              {/* Secondary action */}
              <div className='mt-6 text-center'>
                <Link href='/overlay'>
                  <Button
                    type='link'
                    size='small'
                    className='text-gray-500! hover:text-gray-300! text-xs'
                    onClick={() => track('setup/test_dotabod_clicked')}
                  >
                    Or verify via the overlay preview →
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── AUTO-CONNECT CALLOUT ─────────────────────────────────────── */}
        {!isLinked && (
          <div className='mx-6 mb-6 rounded-lg bg-gray-800/50 border border-gray-700/40 px-5 py-4 flex gap-3 items-start'>
            <div className='mt-0.5 shrink-0 rounded-full bg-violet-900/40 p-1'>
              <CheckCircle2 size={13} className='text-violet-400' />
            </div>
            <div>
              <p className='text-sm text-gray-300 font-medium leading-snug'>
                Connects once, works forever
              </p>
              <p className='text-xs text-gray-500 mt-0.5 leading-relaxed'>
                {STEAM_CONNECTION_MESSAGES.autoConnectInfo}
              </p>
            </div>
          </div>
        )}

        {/* ── TROUBLESHOOTING (progressive disclosure) ─────────────────── */}
        {!isLinked && (
          <div className='px-4 pb-8'>
            <Collapse
              ghost
              onChange={() => track('setup/collapse_test_dotabod')}
              items={[
                {
                  key: '1',
                  label: (
                    <span className='text-gray-500 text-xs hover:text-gray-300 transition-colors'>
                      Having trouble? See detailed instructions
                    </span>
                  ),
                  children: (
                    <div className='space-y-6 text-sm text-gray-300 pl-2'>
                      {!isLive && (
                        <p className='text-amber-400 text-xs font-medium'>
                          ⚠ {STEAM_CONNECTION_MESSAGES.streamMustBeOnlineToConnect}
                        </p>
                      )}

                      <div>
                        <p className='font-medium text-gray-200 mb-2'>
                          Why demo a hero instead of a real match?
                        </p>
                        <p className='text-xs text-gray-500 leading-relaxed'>
                          Demo hero mode (
                          <strong className='text-gray-400'>Play → Demo a Hero</strong> in the Dota
                          2 menu) triggers the game state integration instantly without needing a
                          real match. It's the fastest way to verify everything works in about 2
                          minutes. Playing a normal match works too — it just takes longer.
                        </p>
                      </div>

                      <div>
                        <p className='font-medium text-gray-200 mb-2'>Verify it worked:</p>
                        <ol className='list-decimal list-inside space-y-1.5 text-gray-400 text-xs'>
                          <li>
                            Open{' '}
                            <Link
                              href='/dashboard/features'
                              className='text-violet-400 hover:text-violet-300 underline-offset-2 hover:underline'
                            >
                              Features → MMR Tracker
                            </Link>
                          </li>
                          <li>Your Steam account should appear with your avatar and MMR</li>
                        </ol>
                      </div>

                      <div>
                        <p className='font-medium text-amber-400 mb-2 text-xs'>
                          Account didn't appear after playing?
                        </p>
                        <ul className='space-y-1.5 text-gray-500 text-xs'>
                          <li>✓ Confirm your Twitch stream was live when you played</li>
                          <li>
                            ✗ If it was live and still didn't connect, the game config script from
                            Step 2 may not have run correctly. Contact support with a screenshot of
                            your PowerShell output.
                          </li>
                        </ul>
                        <Link href='/dashboard/help'>
                          <Button size='small' className='mt-3'>
                            Contact support
                          </Button>
                        </Link>
                      </div>

                      <div className='rounded-xl overflow-hidden'>
                        <Image
                          alt='Demo a hero in Dota 2 menu'
                          width={2384}
                          height={1506}
                          className='w-full'
                          src='https://i.imgur.com/nJrBvdf.png'
                        />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>
    </motion.div>
  )
}
