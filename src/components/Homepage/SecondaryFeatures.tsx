import { BentoCard, BentoGrid, type BentoGridItemProps } from '@/components/magicui/bento-grid'
import { Settings } from '@/lib/defaultSettings'
import { Popover, Typography } from 'antd'
import { SparklesIcon } from 'lucide-react'
import Image from 'next/image'
import React from 'react'
import { Container } from 'src/components/Container'
import CommandDetail from 'src/components/Dashboard/CommandDetail'
import TwitchChat from 'src/components/TwitchChat'
import { chatterInfo } from '../Dashboard/Features/ChatterCard'
import { MMRBadge } from '../Overlay/rank/MMRBadge'

const { Link } = Typography

export function SecondaryFeatures() {
  const features: BentoGridItemProps[] = [
    {
      background: (
        <div className='flex flex-col items-center justify-center'>
          {CommandDetail[Settings.commandWL].response({}, false)}
        </div>
      ),
      name: 'Real-Time Win/Loss Overlay',
      disableHover: false,
      cta: (
        <Popover
          className='self-end'
          content={
            <Image
              alt='wl overlay'
              width={534}
              height={82}
              src='/images/dashboard/wl-overlay.png'
            />
          }
        >
          <Link className='flex space-x-1' onClick={(e) => e.preventDefault()}>
            <SparklesIcon className='text-purple-200' height={22} />
            <span className='text-purple-300'>Preview</span>
          </Link>
        </Popover>
      ),
      description:
        'Instantly display your ranked or unranked win-loss record, current MMR, and progress to next rank on stream with one simple command.',
      className: 'lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2',
    },
    {
      name: 'MMR badge and tracking',
      disableHover: false,
      cta: (
        <Popover
          content={
            <Image
              alt='mmr tracker'
              width={534}
              height={82}
              src='/images/dashboard/mmr-tracker.png'
            />
          }
        >
          <Link onClick={(e) => e.preventDefault()}>
            <span className='flex items-center space-x-1'>
              <SparklesIcon className='text-purple-200' height={22} />
              <span className='text-purple-300'>Preview</span>
            </span>
          </Link>
        </Popover>
      ),
      background: (
        <div className='flex flex-col items-center justify-center'>
          {CommandDetail[Settings.commandMmr].response()}
          <div className='mt-6 flex justify-center space-x-4'>
            <MMRBadge image='55.png' rank={3860} className='self-center rounded-md!' />
            <MMRBadge
              image='92.png'
              className='self-center rounded-md!'
              leaderboard={1}
              rank={13150}
            />
          </div>
        </div>
      ),
      description: 'Show off your current rank, or leaderboard standing on stream.',
      className: 'lg:row-start-1 lg:row-end-3 lg:col-start-2 lg:col-end-3',
    },
    {
      name: 'Instant Smurf Detection',
      description:
        'Immediately identify smurfs by displaying the lifetime matches of players in your current game.',
      background: (
        <div className='flex flex-col items-center justify-center'>
          {CommandDetail[Settings.commandSmurfs].response()}
        </div>
      ),
      className: 'lg:row-start-1 lg:row-end-2 lg:col-start-3 lg:col-end-4',
    },
    {
      name: 'Dotabod has things to say',
      description: 'But only when the game conditions meet the correct parameters.',
      background: (
        <div className='flex flex-col items-center justify-center'>
          <TwitchChat
            responses={[
              chatterInfo.smoke.message,
              chatterInfo.passiveDeath.message,
              chatterInfo.pause.message,
              chatterInfo.powerTreads.message,
            ]}
          />
        </div>
      ),
      className: 'lg:row-start-2 lg:row-end-3 lg:col-start-3 lg:col-end-4',
    },
    {
      name: 'Roshan & Aegis Timers',
      cta: (
        <Popover
          content={
            <div className='flex flex-col items-center space-y-4 text-white'>
              <Image
                alt='aegis timer'
                width={372}
                height={141}
                src='/images/dashboard/just-aegis-timer.png'
              />
              <span>Aegis timer</span>
              <Image
                alt='rosh timer'
                width={336}
                height={249}
                src='/images/dashboard/rosh-timer.png'
              />
              <span>Roshan timer</span>
            </div>
          }
        >
          <Link className='flex items-center! space-x-1' onClick={(e) => e.preventDefault()}>
            <SparklesIcon className='text-purple-200' height={22} />
            <span className='text-purple-300'>Preview</span>
          </Link>
        </Popover>
      ),
      disableHover: false,
      description: 'Automatic timers clearly showing Roshan respawn windows and Aegis pickups.',
      className: 'lg:row-start-3 lg:row-end-4 lg:col-start-1 lg:col-end-3',
      background: (
        <div className='flex flex-col items-center justify-center'>
          <TwitchChat
            responses={[
              <React.Fragment key={1}>
                <span>{chatterInfo.roshanKilled.message}</span>
              </React.Fragment>,
              <React.Fragment key={2}>
                <span>{chatterInfo.roshPickup.message}</span>
              </React.Fragment>,
            ]}
          />
        </div>
      ),
    },
    {
      name: 'In-Game Medal Tracking',
      description: CommandDetail[Settings.commandGM].description,
      background: (
        <div className='flex flex-col items-center justify-center'>
          {CommandDetail[Settings.commandGM].response()}
        </div>
      ),
      className: 'lg:row-start-3 lg:row-end-4 lg:col-start-3 lg:col-end-4',
    },
  ]

  return (
    <section
      id='secondary-features'
      aria-label='Features for building a portfolio'
      className='py-20'
    >
      <Container>
        <div className='mx-auto max-w-2xl sm:text-center'>
          <h2 className='text-3xl font-medium tracking-tight text-gray-200'>
            But wait, there&apos;s more.
          </h2>
          <p className='mt-2 text-lg text-gray-300'>
            Under active development and speaking to multiple Dota 2 personalities, features are
            being added as they are requested.
          </p>
        </div>
        <BentoGrid className='lg:grid-rows-3'>
          {features.map((feature, i) => (
            <BentoCard key={i} {...feature} />
          ))}
        </BentoGrid>
      </Container>
    </section>
  )
}
