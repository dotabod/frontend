import { Button } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Shield, Sparkles, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Container } from 'src/components/Container'

const spotlights = [
  {
    bullets: [
      'Auto-open and close Twitch predictions every match',
      'Connect Twitch, Dota 2, OBS, and 7TV from one setup flow',
      'Trigger scene changes and overlays without manual babysitting',
    ],
    description:
      'The repetitive work disappears, so your stream feels polished before the first creep wave.',
    icon: Zap,
    image: '/images/dashboard/bets.png',
    imageAlt: 'Predictions dashboard preview',
    kicker: 'Automation engine',
    title: 'From setup to match flow, the stream runs with you instead of against you.',
  },
  {
    bullets: [
      'Block minimap, hero picks, and queue states with the right overlay at the right time',
      'Handle multiple minimap layouts, sizes, and stream configurations',
      'Add delay-aware protection that fits serious ranked play',
    ],
    description:
      'Protection is built into the product, not bolted on after you get punished for showing too much.',
    icon: Shield,
    image: '/images/overlay/minimap/741-Complex-Large-AntiStreamSnipeMap.png',
    imageAlt: 'Minimap anti-snipe overlay preview',
    kicker: 'Anti-snipe suite',
    title: 'Keep the stream watchable without giving away your game.',
  },
  {
    bullets: [
      'Show MMR, medal, win-loss, and leaderboard context on stream',
      'Surface Roshan and Aegis timing automatically when the game state changes',
      'Give viewers more reasons to stay with win probability and notable player moments',
    ],
    description:
      'Viewers instantly understand more of the match, and your stream feels richer without more manual work.',
    icon: Sparkles,
    image: '/images/dashboard/rosh-timer.png',
    imageAlt: 'Roshan timer overlay preview',
    kicker: 'Live game intelligence',
    title: 'Turn live game data into moments people actually notice.',
  },
]

export function PrimaryFeatures() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeFeature = spotlights[activeIndex]

  return (
    <section id='features' aria-labelledby='features-title' className='bg-gray-900 py-20 sm:py-24'>
      <Container>
        <div className='grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start'>
          <div>
            <p className='text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300'>
              Core experience
            </p>
            <h2
              id='features-title'
              className='mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl'
            >
              The parts of your stream people notice fastest, organized by outcome.
            </h2>
            <p className='mt-4 max-w-2xl text-lg leading-8 text-gray-400'>
              Instead of making you hunt through a dashboard, Dotabod brings the biggest wins into a
              few clear systems: automation, protection, and live game intelligence.
            </p>

            <div className='mt-8 space-y-3'>
              {spotlights.map((feature, index) => {
                const Icon = feature.icon
                const isActive = activeIndex === index

                return (
                  <button
                    key={feature.title}
                    type='button'
                    onClick={() => setActiveIndex(index)}
                    className={`w-full rounded-3xl border p-5 text-left transition-all duration-300 ${
                      isActive
                        ? 'border-cyan-400/40 bg-cyan-400/10 shadow-[0_20px_80px_-40px_rgba(34,211,238,0.75)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className='flex items-start gap-4'>
                      <div className='rounded-2xl border border-white/10 bg-black/20 p-3 text-cyan-300'>
                        <Icon className='h-5 w-5' />
                      </div>
                      <div>
                        <p className='text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300'>
                          {feature.kicker}
                        </p>
                        <h3 className='mt-2 text-lg font-semibold text-white'>{feature.title}</h3>
                        <p className='mt-2 text-sm leading-6 text-gray-400'>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className='mt-8 flex flex-wrap gap-4'>
              <Link href='/dashboard' prefetch={false}>
                <Button type='primary' size='large'>
                  See your setup flow
                </Button>
              </Link>
              <Link href='/#pricing' scroll>
                <Button size='large'>See what unlocks in Pro</Button>
              </Link>
            </div>
          </div>

          <div className='overflow-hidden rounded-[2rem] border border-white/10 bg-linear-to-br from-white/[0.08] via-white/[0.03] to-transparent p-5 shadow-[0_30px_120px_-60px_rgba(34,211,238,0.35)] sm:p-6'>
            <AnimatePresence mode='wait'>
              <motion.div
                key={activeFeature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300'>
                      {activeFeature.kicker}
                    </p>
                    <h3 className='mt-2 text-2xl font-semibold text-white'>
                      {activeFeature.title}
                    </h3>
                  </div>
                  <span className='rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-gray-300'>
                    Built for serious stream UX
                  </span>
                </div>

                <div className='mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950'>
                  <Image
                    src={activeFeature.image}
                    alt={activeFeature.imageAlt}
                    width={1200}
                    height={900}
                    className='h-auto w-full object-cover'
                  />
                </div>

                <div className='mt-6 grid gap-3 sm:grid-cols-1'>
                  {activeFeature.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className='flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-gray-300'
                    >
                      <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-cyan-300' />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className='mt-12 grid gap-4 md:grid-cols-3'>
          <div className='rounded-3xl border border-white/10 bg-black/20 p-5'>
            <p className='text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300'>
              Built to convert viewers
            </p>
            <p className='mt-3 text-sm leading-6 text-gray-400'>
              Predictions, chat moments, and live stats create more reasons for viewers to stay and
              interact instead of quietly lurking.
            </p>
          </div>
          <div className='rounded-3xl border border-white/10 bg-black/20 p-5'>
            <p className='text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300'>
              Built for ranked confidence
            </p>
            <p className='mt-3 text-sm leading-6 text-gray-400'>
              Anti-snipe tools work together, so you can protect the stream without turning the
              broadcast into a black box.
            </p>
          </div>
          <div className='rounded-3xl border border-white/10 bg-black/20 p-5'>
            <p className='text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300'>
              Built to grow with you
            </p>
            <p className='mt-3 text-sm leading-6 text-gray-400'>
              Start with the free plan, then unlock more automation, overlays, and management tools
              when your stream is ready for more.
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
