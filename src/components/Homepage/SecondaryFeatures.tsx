import { Button } from 'antd'
import { Gift, Globe2, Music4, Settings2, ShieldEllipsis, Users } from 'lucide-react'
import Link from 'next/link'
import { Container } from 'src/components/Container'
import { MagicCard } from '@/components/magicui/magic-card'

const discoverabilityCards = [
  {
    description:
      '50+ game-aware chat reactions keep the stream lively with kills, power spikes, Roshan events, and more.',
    highlights: ['Contextual chatter', 'Predictions callouts', 'Command moments'],
    icon: ShieldEllipsis,
    title: 'The bot actually has personality',
  },
  {
    description:
      'Support 40+ languages and translate messages on stream so more of your audience can follow the action.',
    highlights: ['40+ languages', 'Auto-translation', 'Overlay-ready'],
    icon: Globe2,
    title: 'Built for international audiences',
  },
  {
    description:
      'Let trusted moderators manage settings and commands without giving them access to everything in your account.',
    highlights: ['Manager access', 'Safer collaboration', 'Dashboard control'],
    icon: Users,
    title: 'Let your team help without chaos',
  },
  {
    description:
      'Gift subscriptions make it easier for your community to support the stream and make those moments visible on stream.',
    highlights: ['Gift flow', 'On-stream alerts', 'Community moments'],
    icon: Gift,
    title: 'Turn support into visible community hype',
  },
  {
    description:
      'Connect music overlays and the !song command so viewers can follow what you are playing while you queue or grind.',
    highlights: ['!song command', 'Overlay support', 'Last.fm and media hooks'],
    icon: Music4,
    title: 'More than gameplay: useful creator extras',
  },
  {
    description:
      'Automate the annoying setup work, from 7TV and Twitch permissions to Dota 2 config and overlay prep.',
    highlights: ['7TV setup', 'Twitch automation', 'Dota 2 GSI export'],
    icon: Settings2,
    title: 'Setup feels like a product, not a checklist',
  },
]

export function SecondaryFeatures() {
  return (
    <section
      id='discover'
      aria-labelledby='discover-title'
      className='border-t border-white/10 bg-linear-to-b from-gray-900 to-slate-950 py-20 sm:py-24'
    >
      <Container>
        <div className='mx-auto max-w-3xl text-center'>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300'>
            Discover more
          </p>
          <h2
            id='discover-title'
            className='mt-3 text-3xl font-semibold tracking-tight text-gray-100 sm:text-4xl'
          >
            Dotabod has depth, and the coolest parts should not be hidden three menus deep.
          </h2>
          <p className='mt-4 text-lg leading-8 text-gray-400'>
            Beyond overlays and predictions, there is a full layer of creator tooling here: team
            workflows, international audience support, gifting, music integrations, and setup
            automation that makes the whole product feel more premium.
          </p>
        </div>

        <div className='mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {discoverabilityCards.map((card) => {
            const Icon = card.icon

            return (
              <div
                key={card.title}
                className='overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03]'
              >
                <MagicCard className='min-h-full'>
                  <div className='flex h-full flex-col p-6'>
                    <div className='inline-flex w-fit rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200'>
                      <Icon className='h-5 w-5' />
                    </div>
                    <h3 className='mt-5 text-xl font-semibold text-white'>{card.title}</h3>
                    <p className='mt-3 text-sm leading-6 text-gray-400'>{card.description}</p>
                    <div className='mt-5 flex flex-wrap gap-2'>
                      {card.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className='rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-gray-300'
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                </MagicCard>
              </div>
            )
          })}
        </div>

        <div className='mt-10 flex justify-center'>
          <Link href='/dashboard' prefetch={false}>
            <Button size='large'>Browse the full feature set</Button>
          </Link>
        </div>
      </Container>
    </section>
  )
}
