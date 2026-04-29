import Image from 'next/image'
import Link from 'next/link'
import type { FC } from 'react'

import { Container } from 'src/components/Container'

const faqs = [
  {
    answer:
      'You can start right away with your Twitch login, then follow the guided setup for Dota 2, overlays, and any optional extras like OBS or 7TV.',
    question: 'How quickly can I get started?',
  },
  {
    answer:
      'No. Core overlays work without scene switching. OBS automation is optional, but it makes the whole experience feel much more polished once you are ready for it.',
    question: 'Do I need OBS scene switching to use Dotabod?',
  },
  {
    answer:
      'Yes. Dotabod is useful even if you are still growing because the free plan covers core overlays, commands, MMR tracking, and chat features. Pro adds the deeper automation and protection layer.',
    question: 'Is this only for big streamers?',
  },
  {
    answer:
      'No. Dotabod uses Dota 2 game state integration and browser sources, which are intended ways to build live stream enhancements around the game.',
    question: 'Is this allowed to use on stream?',
  },
  {
    answer:
      'The free plan gives you the essentials: setup, commands, MMR and win-loss overlays, multi-language support, and core chat engagement. Pro unlocks automation, advanced anti-snipe tools, richer overlays, managers, and more.',
    question: 'What do I get before upgrading?',
  },
  {
    answer: (
      <div>
        Yes. Dotabod includes minimap, picks, and queue blockers, plus stream-delay-aware tooling.
        It cannot eliminate every risk in the universe, but it is a much better plan than politely
        asking stream snipers to behave{' '}
        <Image
          className='inline align-bottom'
          src='/images/emotes/peepofat.gif'
          height={28}
          width={28}
          alt='peepofat'
          unoptimized
        />
        .
      </div>
    ),
    question: 'Can Dotabod really help with stream sniping?',
  },
]

export const Faqs: FC = () => {
  return (
    <section
      id='faqs'
      aria-labelledby='faqs-title'
      className='border-t border-white/10 bg-slate-950 py-20 sm:py-24'
    >
      <Container>
        <div className='mx-auto max-w-3xl text-center'>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300'>
            Clear answers
          </p>
          <h2
            id='faqs-title'
            className='mt-3 text-3xl font-semibold tracking-tight text-gray-100 sm:text-4xl'
          >
            Everything people ask before they click “get started”.
          </h2>
          <p className='mt-4 text-lg leading-8 text-gray-400'>
            If you have anything else you want to ask,{' '}
            <Link href='/dashboard/help' prefetch={false} className='text-gray-200 underline'>
              reach out to us through our help page
            </Link>
            .
          </p>
        </div>
        <ul className='mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {faqs.map((faq) => (
            <li
              key={faq.question}
              className='rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6'
            >
              <h3 className='text-lg font-semibold leading-7 text-gray-100'>{faq.question}</h3>
              <div className='mt-4 text-sm leading-7 text-gray-400'>{faq.answer}</div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
