import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import DashboardShell from '@/components/DashboardShell'
import TwitchChat from '@/components/TwitchChat'
import { DBSettings } from '@/lib/DBSettings'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

export const CommandDetail = {
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
}

export default function CommandsPage() {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Features</title>
      </Head>
      <DashboardShell title="Commands">
        {Object.keys(CommandDetail).map((key) => (
          <CommandsCard key={key} command={CommandDetail[key as DBSettings]} />
        ))}
      </DashboardShell>
    </>
  ) : null
}
