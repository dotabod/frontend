import { Container } from 'src/components/Container'
import Image from 'next/image'
import { Badge, Display, Link } from '@geist-ui/core'
import { HoverCard } from '@mantine/core'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { MMRBadge } from '../Overlay/rank/MMRBadge'
import WinLossCard from '../Overlay/wl/WinLossCard'
import TwitchChat from '../TwitchChat'
import React from 'react'
import CommandDetail from 'src/components/Dashboard/CommandDetail'
import { chatterInfo } from '../Dashboard/Features/ChatterCard'
import { Settings } from '@/lib/defaultSettings'

export function SecondaryFeatures() {
  const features = [
    {
      name: (
        <div className="space-between flex w-full items-center">
          <span className="w-full">Win loss overlay and command</span>
          <HoverCard closeDelay={200} shadow="md">
            <HoverCard.Target>
              <Link
                className="flex !items-center space-x-1"
                onClick={(e) => e.preventDefault()}
                color
                underline
              >
                <SparklesIcon height={22} />
                <span>Preview</span>
              </Link>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Image
                alt="wl overlay"
                width={353}
                height={333}
                src="/images/dashboard/wl-overlay.png"
              />
            </HoverCard.Dropdown>
          </HoverCard>
        </div>
      ),
      description: (
        <div>
          <span>
            Tell everyone watching what your current Win Loss record is.
            Automatically displays ranked or unranked, or both at the same time!
          </span>
          {CommandDetail[Settings.commandWL].response({}, false)}

          <div className="mt-2 flex justify-center space-x-4">
            <WinLossCard
              className="self-center"
              wl={[{ win: 1, lose: 50, type: 'R' }]}
            />
            <WinLossCard
              wl={[
                { win: 1, lose: 50, type: 'R' },
                { win: 1, lose: 50, type: 'U' },
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      name: (
        <div className="space-between flex w-full items-center">
          <span className="w-full">MMR badge and tracking</span>
          <HoverCard closeDelay={200} shadow="md">
            <HoverCard.Target>
              <Link
                className="flex !items-center space-x-1"
                onClick={(e) => e.preventDefault()}
                color
                underline
              >
                <SparklesIcon height={22} />
                <span>Preview</span>
              </Link>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Image
                alt="mmr tracker"
                width={534}
                height={82}
                src="/images/dashboard/mmr-tracker.png"
              />
            </HoverCard.Dropdown>
          </HoverCard>
        </div>
      ),
      description: (
        <div>
          <span>
            Show off your current rank, or leaderboard standing on stream.
          </span>
          {CommandDetail[Settings['mmr-tracker']].response()}
          <div className="mt-6 flex justify-center space-x-4">
            <MMRBadge
              image="55.png"
              rank="3860"
              className="self-center !rounded-md"
            />
            <MMRBadge
              image="92.png"
              className="self-center !rounded-md"
              leaderboard="1"
              rank="13150"
            />
          </div>
        </div>
      ),
    },
    {
      name: 'Smurf detection',
      description: (
        <div>
          {CommandDetail[Settings.commandSmurfs].description}
          {CommandDetail[Settings.commandSmurfs].response()}
        </div>
      ),
    },
    {
      name: 'Dotabod has things to say',
      description: (
        <div className="">
          <span>
            But only when the game conditions meet the correct parameters.
          </span>
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
    },
    {
      name: (
        <div className="space-between flex w-full items-center">
          <span className="w-full">Aegis and rosh timer</span>
          <HoverCard closeDelay={200} shadow="md">
            <HoverCard.Target>
              <Link
                className="flex !items-center space-x-1"
                onClick={(e) => e.preventDefault()}
                color
                underline
              >
                <SparklesIcon height={22} />
                <span>Preview</span>
              </Link>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Display shadow caption="Aegis timer">
                <Image
                  alt="aegis timer"
                  width={372}
                  height={141}
                  src="/images/dashboard/just-aegis-timer.png"
                />
              </Display>
              <Display shadow caption="Roshan timer">
                <Image
                  alt="rosh timer"
                  width={336}
                  height={249}
                  src="/images/dashboard/rosh-timer.png"
                />
              </Display>
            </HoverCard.Dropdown>
          </HoverCard>
        </div>
      ),
      description: (
        <div>
          <p>
            Tired of copy pasting three clock times? Dotabod knows when rosh is
            killed or when the aegis is picked up. A timer will display for your
            viewers to see!
          </p>
          <TwitchChat
            responses={[
              <React.Fragment key={1}>
                <span>Roshan killed! Next roshan between 15:32 and 26:32</span>
              </React.Fragment>,
              <React.Fragment key={2}>
                <span>Clockwerk picked up the aegis!</span>
              </React.Fragment>,
            ]}
          />
        </div>
      ),
    },
    {
      name: 'Game medals',
      description: (
        <div>
          {CommandDetail[Settings.commandGM].description}
          {CommandDetail[Settings.commandGM].response()}
        </div>
      ),
    },
  ]

  return (
    <section
      id="secondary-features"
      aria-label="Features for building a portfolio"
      className="py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl sm:text-center">
          <h2 className="text-3xl font-medium tracking-tight text-gray-900">
            But wait, there&apos;s more.
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            Under active development and speaking to multiple Dota 2
            personalities, features are being added as they are requested.
          </p>
        </div>
        <ul
          role="list"
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 text-sm sm:mt-20 sm:grid-cols-2 md:gap-y-10 lg:max-w-none lg:grid-cols-3"
        >
          {features.map((feature, i) => (
            <li key={i} className="rounded-2xl border border-gray-200 p-8">
              <h3 className="flex items-center justify-between space-x-2 font-semibold text-gray-900">
                {feature.name}
                {feature.inProgress && (
                  <Badge scale={0.5} type="secondary" className="opacity-60">
                    in progress
                  </Badge>
                )}
              </h3>
              <div className="mt-2 text-gray-700">{feature.description}</div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
