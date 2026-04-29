import { Button } from 'antd'
import { ArrowRight, LucideHome, WalletCards } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Container } from '@/components/Container'

export function ClosingCta() {
  const { status } = useSession()

  return (
    <section className='border-t border-white/10 bg-black py-20'>
      <Container>
        <div className='overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-linear-to-br from-cyan-500/10 via-slate-950 to-fuchsia-500/10 p-8 shadow-[0_0_100px_-40px_rgba(34,211,238,0.45)] sm:p-12 lg:p-16'>
          <div className='max-w-3xl'>
            <p className='text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300'>
              Ready when you are
            </p>
            <h2 className='mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl'>
              Give your stream the premium layer viewers can feel in the first match.
            </h2>
            <p className='mt-4 max-w-2xl text-base text-gray-300 sm:text-lg'>
              Start free, turn on the features you want most, and upgrade only when you are ready
              for the full automation and anti-snipe toolkit.
            </p>
          </div>

          <div className='mt-8 flex flex-wrap gap-4'>
            <Link href='/dashboard' prefetch={false}>
              <Button type='primary' size='large'>
                <span className='flex items-center gap-2'>
                  <LucideHome className='h-4 w-4' />
                  {status === 'authenticated' ? 'Open dashboard' : 'Get started free'}
                </span>
              </Button>
            </Link>
            <Link href='/#pricing' scroll>
              <Button size='large'>
                <span className='flex items-center gap-2'>
                  <WalletCards className='h-4 w-4' />
                  Compare plans
                </span>
              </Button>
            </Link>
          </div>

          <div className='mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-400'>
            <span className='inline-flex items-center gap-2'>
              <ArrowRight className='h-4 w-4 text-cyan-300' /> Free plan available
            </span>
            <span className='inline-flex items-center gap-2'>
              <ArrowRight className='h-4 w-4 text-cyan-300' /> Works with Twitch, OBS, and Dota 2
              GSI
            </span>
            <span className='inline-flex items-center gap-2'>
              <ArrowRight className='h-4 w-4 text-cyan-300' /> Upgrade later for automation and Pro
              overlays
            </span>
          </div>
        </div>
      </Container>
    </section>
  )
}
