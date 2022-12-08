import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import DashboardShell from '@/components/DashboardShell'
import TwitchChat from '@/components/TwitchChat'
import { DBSettings } from '@/lib/DBSettings'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

export const CommandDetail = {
  commands: {
    title: 'Command list',
    description: 'All available commands with Dotabod',
    cmd: '!commands',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!commands"
        response="command1 · command2 · command3 · etc..."
      />
    ),
  },
  [DBSettings.commandWL]: {
    key: DBSettings.commandWL,
    title: 'Win / Loss',
    description: '',
    cmd: '!wl',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command="!wl" response="Ranked 0 W - 9 L" />
    ),
  },
  [DBSettings.mmrTracker]: {
    key: DBSettings.mmrTracker,
    title: 'MMR',
    description:
      'Using chat command !mmr, viewers can get an accurate mmr update in chat. Auto updates immediately with every match!',
    cmd: '!mmr',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!mmr"
        response="2720 | Archon☆3 | Next rank at 2772 in 2 wins"
      />
    ),
  },
  [DBSettings.commandXPM]: {
    key: DBSettings.commandXPM,
    title: 'XPM',
    description: 'Live experience per minute for your chatters on demand.',
    cmd: '!xpm',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command="!xpm" response="Live XPM: 778" />
    ),
  },
  [DBSettings.commandGPM]: {
    key: DBSettings.commandGPM,
    title: 'GPM',
    description:
      'At any time, chatters can request your live gold per minute with !gpm. Playing alch or anti-mage? Show off your gpm!',
    cmd: '!gpm',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!gpm"
        response="Live GPM: 660. 5270 from hero kills, 9295 from creep kills."
      />
    ),
  },
  [DBSettings.commandAPM]: {
    key: DBSettings.commandAPM,
    title: 'APM',
    description:
      'Actions per minute. A good indicator of speed and efficiency.',
    cmd: '!apm',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command="!apm" response="Live APM: 123" />
    ),
  },
  [DBSettings.commandPleb]: {
    key: DBSettings.commandPleb,
    title: 'Pleb',
    description:
      'When you have sub only mode turned on, use !pleb to let one non-sub send a message. Then all your subs can point and laugh 😂.',
    cmd: '!pleb',
    alias: [],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command="!pleb"
        response="One pleb IN 👇"
      />
    ),
  },
  [DBSettings.commandNP]: {
    key: DBSettings.commandNP,
    title: 'Notable players',
    description: 'Find out if your match has any pros.',
    cmd: '!np',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!np"
        response="All Pick [9162 avg MMR]: Xcalibur (Shadow Shaman) · Arteezy (Ember Spirit) · Puppy (Snapfire) · Kyzko (Tusk) · Egor (Timbersaw)"
      />
    ),
  },
  [DBSettings.commandSmurfs]: {
    key: DBSettings.commandSmurfs,
    title: 'Smurfs',
    description: 'Shows total games played for each player in the match.',
    cmd: '!smurfs',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!smurfs"
        response="Lifetime games: Tusk: 4,202 · Pugna: 4,466 · Doom: 657 · Drow Ranger: 3,136 · Lina: 2,735 · Clinkz: 3,384 · Viper: 408 · Sniper: 2,850 · Hoodwink: 2,243 · Dazzle: 6,626"
      />
    ),
  },
  [DBSettings.commandGM]: {
    key: DBSettings.commandGM,
    title: 'Game medals',
    description: 'Return the rankings for each players in the game.',
    cmd: '!gm',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!gm"
        response="Legion Commander: #856 · Dark Willow: #402 · Crystal Maiden: #321 · Weaver: #553 · Storm Spirit: #794 · Doom: #536 · Rubick: #524 · Dawnbreaker: #946 · Venomancer: #631 · Lifestealer: #294"
      />
    ),
  },
  [DBSettings.commandLG]: {
    key: DBSettings.commandLG,
    title: 'Last game',
    description: "Find out if you're playing with anyone from your last match.",
    cmd: '!lg',
    alias: ['!lastgame'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!lg"
        response="Rubick played as Crystal Maiden"
      />
    ),
  },
  [DBSettings.commandModsonly]: {
    key: DBSettings.commandModsonly,
    title: 'Mods only',
    description:
      'Only allow mods to send messages in chat. Turns sub only mode on and deletes messages from subs.',
    cmd: '!modsonly',
    alias: [],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command="!modsonly"
        response="Mod only mode enabled"
      />
    ),
  },
  [DBSettings.commandHero]: {
    key: DBSettings.commandHero,
    title: 'Hero',
    description: 'Shows the stats for your currently played hero.',
    cmd: '!hero',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!hero"
        response="Winrate: 90% as Clockwerk in 30d of 12 matches."
      />
    ),
  },
  ping: {
    title: 'Ping',
    description: '',
    cmd: '!ping',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command="!ping" response="Pong EZ Clap" />
    ),
  },
  dotabod: {
    title: 'About',
    description: "Tell everyone about the new bot you're using!",
    cmd: '!dotabod',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!dotabod"
        response="I'm an open source bot made by @techleed. More info: https://dotabod.com"
      />
    ),
  },
  refresh: {
    title: 'Refresh',
    description:
      'Refreshes your OBS overlay without having to do it from OBS. Used in case the overlay is messed up.',
    cmd: '!refresh',
    alias: [],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command="!refresh"
        response="Refreshing overlay..."
      />
    ),
  },
  steam: {
    title: 'Steam ID',
    description:
      "Retrieve the steam ID of the account you're currently playing on.",
    cmd: '!steam',
    alias: [],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command="!steam"
        response={`ChannelName https://steamid.xyz/1234567`}
      />
    ),
  },
  'mmr=': {
    title: 'Set MMR',
    description: 'Manually set your MMR.',
    cmd: '!mmr=',
    alias: [],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command="!mmr= 1234"
        response="Updated MMR to 1234"
      />
    ),
  },
}

export default function CommandsPage() {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Features</title>
      </Head>
      <DashboardShell
        subtitle="An exhaustive list of all commands available with the Dotabod chat bot."
        title="Commands"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.keys(CommandDetail).map((key) => (
            <CommandsCard key={key} command={CommandDetail[key]} />
          ))}
        </div>
      </DashboardShell>
    </>
  ) : null
}
