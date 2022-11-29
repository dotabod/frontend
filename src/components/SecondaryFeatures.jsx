import { Container } from '@/components/Container'
import Image from 'next/image'
import { Badge, Link } from '@geist-ui/core'
import { HoverCard } from '@mantine/core'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { Rankbadge } from './Rankbadge'
import WinLossCard from './WinLossCard'
import TwitchChat from './TwitchChat'

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
                src="/images/wl-overlay.png"
              />
            </HoverCard.Dropdown>
          </HoverCard>
        </div>
      ),
      description: (
        <div>
          <span>
            Create predictions for your viewers to bet on. Dotabod will start
            and stop the prediction automatically.
          </span>
          <TwitchChat command="!wl" response="Ranked 0 W - 9 L" />

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
          <span className="w-full">MMR badge overlay</span>
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
                width={353}
                height={333}
                src="/images/mmr-tracker.png"
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
          <div className="mt-6 flex justify-center space-x-4">
            <Rankbadge image="55.png" rank="3860" />
            <Rankbadge image="92.png" leaderboard rank="9" />
          </div>
        </div>
      ),
    },
    {
      name: 'MMR command',
      description: (
        <>
          Using chat command !mmr, viewers can get an accurate mmr update in
          chat. Auto updates immediately with every match!
          <TwitchChat
            command="!mmr"
            response="2720 | Archon☆3 | Next rank at 2772 in 2 wins"
          />
        </>
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
              <>
                <Image
                  width={22}
                  height={22}
                  alt="pausechamp"
                  className="mr-1 inline align-middle"
                  src="/images/pauseChamp.webp"
                />
                <span>Who paused the game?</span>
              </>,
              <>
                <Image
                  width={22}
                  height={22}
                  alt="pausechamp"
                  className="mr-1 inline align-middle"
                  src="/images/massivePIDAS.webp"
                />
                <span>Use your midas</span>
              </>,
              <>
                <span>🚬💣 Clockwerk is smoked!</span>
              </>,
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
              <Image
                alt="aegis timer"
                width={293}
                height={533}
                src="/images/aegis-timer.png"
              />
            </HoverCard.Dropdown>
          </HoverCard>
        </div>
      ),
      description:
        'Tired of copy pasting three clock times? Dotabod knows when rosh is killed or when the aegis is picked up. A timer will display for your viewers to see!',
    },
    {
      name: 'Hero command',
      description: (
        <>
          Shows the stats for your currently played hero.
          <TwitchChat
            command="!hero"
            response="Winrate: 90% as Clockwerk in 30d of 12 matches."
          />
        </>
      ),
    },
    {
      name: 'XPM command',
      description: (
        <>
          Live experience per minute for your chatters on demand.
          <TwitchChat command="!xpm" response="Live XPM: 778" />
        </>
      ),
    },
    {
      name: 'GPM command',
      description: (
        <>
          At any time, chatters can request your live gold per minute with !gpm.
          Playing alch or anti-mage? Show off your gpm!
          <TwitchChat
            command="!gpm"
            response="Live GPM: 660. 5270 from hero kills, 9295 from creep kills."
          />
        </>
      ),
    },
    {
      name: 'Pleb command',
      description: (
        <div>
          When you have sub only mode turned on, use !pleb to let one non-sub
          send a message. Then all your subs can point and laugh 😂.
          <TwitchChat modOnly command="!pleb" response="One pleb IN 👇" />
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
            personalities, we will be adding more features as they are
            requested.
          </p>
        </div>
        <ul
          role="list"
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 text-sm sm:mt-20 sm:grid-cols-2 md:gap-y-10 lg:max-w-none lg:grid-cols-3"
        >
          {features.map((feature) => (
            <li
              key={feature.name}
              className="rounded-2xl border border-gray-200 p-8"
            >
              <h3 className="mt-6 flex items-center justify-between space-x-2 font-semibold text-gray-900">
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
