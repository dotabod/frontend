import { Globe2, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react'
import { Container } from '@/components/Container'

const proofItems = [
  {
    description: 'Trusted by more than 30,000 Twitch streamers across every stage of growth.',
    icon: Sparkles,
    title: 'Built for creators who want their stream to feel dialed in',
  },
  {
    description: 'Connect Dota 2, Twitch, OBS, and 7TV without turning setup into a side quest.',
    icon: Globe2,
    title: 'One workflow for setup, overlays, and automation',
  },
  {
    description:
      'Minimap, picks, queue blockers, and delay-aware timing help protect ranked games.',
    icon: ShieldCheck,
    title: 'A real anti-snipe toolkit, not just one overlay',
  },
  {
    description:
      'Predictions, contextual reactions, commands, and translation keep chat active all game.',
    icon: MessageSquareText,
    title: 'Audience features that make the stream feel alive',
  },
]

export function ProofStrip() {
  return (
    <section
      id='why-dotabod'
      aria-labelledby='why-dotabod-title'
      className='border-y border-white/10 bg-black/30 py-8 sm:py-10'
    >
      <Container>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div className='max-w-2xl'>
            <p className='text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300'>
              Why Dotabod
            </p>
            <h2
              id='why-dotabod-title'
              className='mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl'
            >
              Premium stream utility without premium setup pain
            </h2>
          </div>
          <p className='max-w-xl text-sm text-gray-400 sm:text-base'>
            Dotabod combines automation, protection, and live game intelligence into one system so
            your stream looks sharper and runs smoother.
          </p>
        </div>

        <div className='mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {proofItems.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.title}
                className='rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur'
              >
                <div className='inline-flex rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200'>
                  <Icon className='h-5 w-5' />
                </div>
                <h3 className='mt-4 text-lg font-semibold text-white'>{item.title}</h3>
                <p className='mt-2 text-sm leading-6 text-gray-400'>{item.description}</p>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
