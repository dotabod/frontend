import { useId } from 'react'

import { Container } from '@/components/Container'
import Image from 'next/image'
import { Badge, Link } from '@geist-ui/core'
import { HoverCard } from '@mantine/core'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { Rankbadge } from './Rankbadge'
import WinLossCard from './WinLossCard'

const ModImage = () => (
  <Image
    height={18}
    width={18}
    className="mr-1 inline align-middle"
    alt="twitch mod icon"
    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAE5SURBVHgBpZQ/TgJBGMXfuNho4STGQhu3sLExMdRG0QPgDYweQFkPoOABzOoBhNhDgj0x0dpCGwtNGBpb1wIbimG+CQwssDOb5SWT+bPf/PZ7b5NlaHgnkAgBcGSTAEOZoe611cbHfIpyaSEXW+cId26nzlmDEOALaSD+0ibK21fWGieIL3I877X0PBfoWnXiL/uuMjuIcimpkUaJIFcuUS9C8HFp9rnJDpo/TVX0Z81F/HdQeDnU80h1T9IovQeS1O4KWRU1maTw607yp1U5vDccTC8GVqiLpGDJSuXzBuH3/cznBmSDzbYSl/Pz1zqP2G3lrZAYaLwbuiS6Qp8frO2r0FfgkgFV8w8GQjYKr0caRi84Xi86QbGwCXb6dmZsaMhGMTHgSdAvsv+LBpKCrAW0QGbJCPAqfZUtm2qML5G2AAAAAElFTkSuQmCC"
  />
)

function TwitchChat({
  command,
  modOnly = false,
  responses = [],
  response = null,
}) {
  if (response) responses.push(response)
  return (
    <div className="mt-2 rounded border p-2">
      {command && (
        <div>
          {modOnly && <ModImage />}
          <span className="font-bold text-[#8a2be2]">techleed</span>
          <span className="mr-1">:</span>
          <div className="inline">{command}</div>
        </div>
      )}
      <div className="space-y-1">
        {responses.map((response, i) => (
          <div key={i}>
            <ModImage />
            <span className="font-bold text-[#c90909]">dotabod</span>
            <span className="mr-1">:</span>
            <div className="inline">{response}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeviceCardsIcon(props) {
  let id = useId()

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0a4 4 0 00-4 4v24a4 4 0 004 4h14a4 4 0 004-4V4a4 4 0 00-4-4H9zm0 2a2 2 0 00-2 2v24a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2h-1.382a1 1 0 00-.894.553l-.448.894a1 1 0 01-.894.553h-6.764a1 1 0 01-.894-.553l-.448-.894A1 1 0 0010.382 2H9z"
        fill="#737373"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 13a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H10a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H10a1 1 0 01-1-1v-2zm1 5a1 1 0 00-1 1v2a1 1 0 001 1h12a1 1 0 001-1v-2a1 1 0 00-1-1H10z"
        fill={`url(#${id}-gradient)`}
      />
      <rect x={9} y={6} width={14} height={4} rx={1} fill="#171717" />
      <circle cx={16} cy={16} r={16} fill="#A3A3A3" fillOpacity={0.2} />
      <defs>
        <linearGradient
          id={`${id}-gradient`}
          x1={16}
          y1={12}
          x2={16}
          y2={28}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#737373" />
          <stop offset={1} stopColor="#737373" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  )
}

function DeviceClockIcon(props) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <circle cx={16} cy={16} r={16} fill="#A3A3A3" fillOpacity={0.2} />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 4a4 4 0 014-4h14a4 4 0 014 4v10h-2V4a2 2 0 00-2-2h-1.382a1 1 0 00-.894.553l-.448.894a1 1 0 01-.894.553h-6.764a1 1 0 01-.894-.553l-.448-.894A1 1 0 0010.382 2H9a2 2 0 00-2 2v24a2 2 0 002 2h5v2H9a4 4 0 01-4-4V4z"
        fill="#737373"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 32a8 8 0 100-16 8 8 0 000 16zm1-8.414V19h-2v5.414l4 4L28.414 27 25 23.586z"
        fill="#171717"
      />
    </svg>
  )
}

function DeviceListIcon(props) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0a4 4 0 00-4 4v24a4 4 0 004 4h14a4 4 0 004-4V4a4 4 0 00-4-4H9zm0 2a2 2 0 00-2 2v24a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2h-1.382a1 1 0 00-.894.553l-.448.894a1 1 0 01-.894.553h-6.764a1 1 0 01-.894-.553l-.448-.894A1 1 0 0010.382 2H9z"
        fill="#737373"
      />
      <circle cx={11} cy={14} r={2} fill="#171717" />
      <circle cx={11} cy={20} r={2} fill="#171717" />
      <circle cx={11} cy={26} r={2} fill="#171717" />
      <path
        d="M16 14h6M16 20h6M16 26h6"
        stroke="#737373"
        strokeWidth={2}
        strokeLinecap="square"
      />
      <circle cx={16} cy={16} r={16} fill="#A3A3A3" fillOpacity={0.2} />
    </svg>
  )
}

function DeviceLockIcon(props) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <circle cx={16} cy={16} r={16} fill="#A3A3A3" fillOpacity={0.2} />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 4a4 4 0 014-4h14a4 4 0 014 4v10h-2V4a2 2 0 00-2-2h-1.382a1 1 0 00-.894.553l-.448.894a1 1 0 01-.894.553h-6.764a1 1 0 01-.894-.553l-.448-.894A1 1 0 0010.382 2H9a2 2 0 00-2 2v24a2 2 0 002 2h5v2H9a4 4 0 01-4-4V4z"
        fill="#737373"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 19.5a3.5 3.5 0 117 0V22a2 2 0 012 2v6a2 2 0 01-2 2h-7a2 2 0 01-2-2v-6a2 2 0 012-2v-2.5zm2 2.5h3v-2.5a1.5 1.5 0 00-3 0V22z"
        fill="#171717"
      />
    </svg>
  )
}

function DeviceChartIcon(props) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0a4 4 0 00-4 4v24a4 4 0 004 4h14a4 4 0 004-4V4a4 4 0 00-4-4H9zm0 2a2 2 0 00-2 2v24a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2h-1.382a1 1 0 00-.894.553l-.448.894a1 1 0 01-.894.553h-6.764a1 1 0 01-.894-.553l-.448-.894A1 1 0 0010.382 2H9z"
        fill="#737373"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23 13.838V26a2 2 0 01-2 2H11a2 2 0 01-2-2V15.65l2.57 3.212a1 1 0 001.38.175L15.4 17.2a1 1 0 011.494.353l1.841 3.681c.399.797 1.562.714 1.843-.13L23 13.837z"
        fill="#171717"
      />
      <path
        d="M10 12h12"
        stroke="#737373"
        strokeWidth={2}
        strokeLinecap="square"
      />
      <circle cx={16} cy={16} r={16} fill="#A3A3A3" fillOpacity={0.2} />
    </svg>
  )
}

export function SecondaryFeatures() {
  const features = [
    {
      name: (
        <div className="space-between flex w-full items-center">
          <span className="w-full">Win loss overlay</span>
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

          <div className="mt-6 flex justify-center space-x-4">
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
      name: 'More OBS scenes',
      description:
        "Want a new scene when the game is paused? A new scene when you're spectating a game? Or when you get a rampage? All will be possible.",
      inProgress: true,
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
