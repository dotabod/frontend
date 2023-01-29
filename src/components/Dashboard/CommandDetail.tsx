import TwitchChat from '@/components/TwitchChat'
import Image from 'next/image'
import { Settings } from '@/lib/defaultSettings'

const CommandDetail = {
  [Settings.commandDisable]: {
    title: 'Disable Dotabod',
    description:
      'With this turned on, game events will no longer be recognized and commands will not be responded to.',
    cmd: '!toggle',
    alias: ['mute', 'unmute'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command="!toggle"
        response="Will no longer watch game events nor respond to commands. Type !toggle again to enable."
      />
    ),
  },
  fixparty: {
    title: 'Fix party match',
    description:
      "Dotabod can't detect party games right now (sadge). So if it does 30 mmr for a completed match, use !fixparty to adjust it to 20. You must type this after every party match.",
    cmd: '!fixparty',
    alias: ['fixsolo'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!fixparty"
        modOnly
        responses={[
          'Changing this match to party mmr: dotabuff.com/matches/1234567.',
          'Updated MMR to 3090, -10',
        ]}
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
    alias: ['steamid', 'account'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command="!steam"
        response="steamid.xyz/1234567"
      />
    ),
  },
  setmmr: {
    title: 'Set MMR',
    description: 'Manually set your MMR.',
    cmd: '!setmmr',
    alias: ['mmr=', 'mmrset'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command="!setmmr 1234"
        response="Updated MMR to 1234"
      />
    ),
  },
  beta: {
    title: 'Dotabod Beta',
    description:
      'Want to join the beta? You will get the latest features and updates before anyone else.',
    cmd: '!beta',
    alias: ['joinbeta', 'leavebeta', 'betaoff', 'betaon'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command="!beta"
        response="You are now a beta tester. Visit discord.dotabod.com to see the beta features. Type !beta to undo"
      />
    ),
  },
  [Settings.commandPleb]: {
    key: Settings.commandPleb,
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
  [Settings.commandModsonly]: {
    key: Settings.commandModsonly,
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
        response={
          <>
            Mods only mode is now on
            <Image
              src="https://cdn.betterttv.net/emote/61e918ab06fd6a9f5be168f3/1x.webp"
              width={24}
              height={24}
              alt="based"
              className="ml-1 mr-1 inline"
            />
            <Image
              src="https://cdn.betterttv.net/emote/55b6f480e66682f576dd94f5/1x.webp"
              width={24}
              height={24}
              alt="clap"
              className="ml-1 mr-1 inline"
            />
            . Only mods can type.
          </>
        }
      />
    ),
  },
  commands: {
    key: Settings.commandCommands,
    title: 'Command list',
    description:
      'All available commands with Dotabod. This list is filtered to only the commands you enabled. If a mod uses !commands, it will show mod only commands as well.',
    cmd: '!commands',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!commands"
        responses={[
          'Everyone can use: command1 · command2 · command3 · etc...',
        ]}
      />
    ),
  },
  [Settings.commandRanked]: {
    key: Settings.commandRanked,
    title: 'Ranked or not?',
    description: 'Chatters can find out if this match is ranked or not.',
    cmd: '!ranked',
    alias: ['isranked'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!ranked"
        response="Yes this game is ranked"
      />
    ),
  },
  [Settings.commandAvg]: {
    key: Settings.commandAvg,
    title: 'Average MMR',
    description:
      'For the current game, show the average MMR of all players. Only works if not immortal.',
    cmd: '!avg',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!avg"
        response="3311 · Legend☆2 - Average rank this game"
      />
    ),
  },
  [Settings.commandOpendota]: {
    key: Settings.commandOpendota,
    title: 'Opendota',
    description:
      'Shows the Opendota link for your currently logged in steam account.',
    cmd: '!opendota',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!opendota"
        response="Here's <streamername>: opendota.com/players/1234567"
      />
    ),
  },

  [Settings.commandDotabuff]: {
    key: Settings.commandDotabuff,
    title: 'Dotabuff',
    description:
      'Shows the Dotabuff link for your currently logged in steam account.',
    cmd: '!dotabuff',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!dotabuff"
        response="Here's <streamername>: dotabuff.com/players/1234567"
      />
    ),
  },
  [Settings.commandXPM]: {
    key: Settings.commandXPM,
    title: 'XPM',
    description: 'Live experience per minute for your chatters on demand.',
    cmd: '!xpm',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command="!xpm" response="Live XPM: 778" />
    ),
  },
  [Settings.commandWL]: {
    key: Settings.commandWL,
    title: 'Win / Loss',
    description: '',
    cmd: '!wl',
    alias: ['score', 'winrate', 'wr'],
    allowed: 'all',
    response: (props, all = true) => (
      <>
        <TwitchChat
          {...props}
          command="!wl"
          response="Ranked 0 W - 9 L | -270 MMR"
        />
        {all && (
          <TwitchChat
            {...props}
            command="!wl"
            response="Ranked 0 W - 9 L | -270 MMR | Unranked 2 W - 1 L"
          />
        )}
      </>
    ),
  },
  [Settings['mmr-tracker']]: {
    key: Settings['mmr-tracker'],
    title: 'MMR',
    description:
      'Using chat command !mmr, viewers can get an accurate mmr update in chat. Auto updates immediately with every match!',
    cmd: '!mmr',
    alias: ['rank', 'medal'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!mmr"
        response="2720 | Archon☆3 | Next rank at 2772 in 2 wins"
      />
    ),
  },
  [Settings.commandGPM]: {
    key: Settings.commandGPM,
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
  [Settings.commandAPM]: {
    key: Settings.commandAPM,
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

  [Settings.commandNP]: {
    key: Settings.commandNP,
    title: 'Notable players',
    description: 'Find out if your match has any pros.',
    cmd: '!np',
    alias: ['who', 'players'],
    allowed: 'all',
    response: (props, all = true) => (
      <div className="space-y-6">
        <TwitchChat
          {...props}
          command="!np"
          response={
            <>
              All Pick:
              <Image
                src="/images/flags/south-korea.png"
                width={24}
                height={24}
                alt="south korea"
                className="ml-1 mr-1 inline"
              />
              DuBu (Shadow Shaman) ·
              <Image
                src="/images/flags/russia.png"
                width={24}
                height={24}
                alt="russia"
                className="ml-1 mr-1 inline"
              />
              Collapse (Magnus) ·
              <Image
                src="/images/flags/estonia.png"
                width={24}
                height={24}
                alt="estonia"
                className="ml-1 mr-1 inline"
              />
              Puppy (Chen) ·
              <Image
                src="/images/flags/usa.png"
                width={24}
                height={24}
                alt="usa"
                className="ml-1 mr-1 inline"
              />
              PPD (Tusk) ·
              <Image
                src="/images/flags/lebanon.png"
                width={24}
                height={24}
                alt="usa"
                className="ml-1 mr-1 inline"
              />
              Rajjix (Timbersaw)
            </>
          }
        />
        {all && (
          <>
            <TwitchChat
              {...props}
              command="!np add"
              response="Try !np add <steam32id> <playername>"
            />
            <TwitchChat
              {...props}
              command="!np remove"
              response="Try !np remove <steam32id>"
            />
          </>
        )}
      </div>
    ),
  },
  [Settings.commandSmurfs]: {
    key: Settings.commandSmurfs,
    title: 'Smurfs',
    description: 'Shows total games played for each player in the match.',
    cmd: '!smurfs',
    alias: ['lifetimes', 'totals', 'games', 'smurf'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!smurfs"
        response="Lifetime games: Viper: 408 · Doom: 657 · Hoodwink: 2,243 · Lina: 2,735 · Sniper: 2,850 · Drow Ranger: 3,136 · Clinkz: 3,384 · Tusk: 4,202 · Pugna: 4,466 · Dazzle: 6,626"
      />
    ),
  },
  [Settings.commandGM]: {
    key: Settings.commandGM,
    title: 'Game medals',
    description: 'Return the rankings for each players in the game.',
    cmd: '!gm',
    alias: ['medals', 'ranks'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!gm"
        response="Legion Commander: #856 · Dark Willow: #402 · Crystal Maiden: #321 · Weaver: #553 · Storm Spirit: #794 · Doom: #536 · Rubick: #524 · Dawnbreaker: #946 · Venomancer: #631 · Lifestealer: #294"
      />
    ),
  },
  [Settings.commandLG]: {
    key: Settings.commandLG,
    title: 'Last game',
    description: "Find out if you're playing with anyone from your last match.",
    cmd: '!lg',
    alias: ['lastgame'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!lg"
        response="Rubick played as Crystal Maiden"
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
  lgs: {
    title: 'Last game score',
    description:
      'Quickly see whether or not you won last game, duration, how long ago',
    cmd: '!lgs',
    alias: ['lastgamescore', 'lgscore', 'lgwl'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!lgs"
        response="Last game: won · 47m long · Ended 4m ago · dotabuff.com/matches/6945205"
      />
    ),
  },
  profile: {
    title: 'Profile',
    description:
      'Shows the profile link for the hero color you specify during a live match.',
    cmd: '!profile',
    alias: ['stats', 'check'],
    allowed: 'all',
    response: (props) => (
      <>
        <TwitchChat
          {...props}
          command="!profile blue"
          response="Here's blue: dotabuff.com/matches/1234567."
        />
        <TwitchChat
          {...props}
          command="!profile ?"
          response="Invalid hero color. Must be 1-10 or one of Blue Teal Purple Yellow Orange Pink Olive Light Blue Green Brown"
        />
      </>
    ),
  },
  [Settings.commandHero]: {
    key: Settings.commandHero,
    title: 'Hero',
    description:
      "Shows currently playing hero's score in the last 30 days. Uses OpenDota API, so your profile must be public for this to work.",
    cmd: '!hero',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <>
        <TwitchChat
          {...props}
          command="!hero"
          response="No matches played as Clockwerk in 30d"
        />
        <TwitchChat
          {...props}
          command="!hero"
          response="Winrate: 53% as Clockwerk in 30d of 41 matches. "
        />
      </>
    ),
  },
  [Settings.commandBuilds]: {
    key: Settings.commandBuilds,
    title: 'Dota 2 Pro Tracker',
    description:
      'Get a quick link to pro builds and guides for your currently playing hero.',
    cmd: '!builds',
    alias: ['dota2pt', 'build', 'd2pt', 'getbuild'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!builds"
        response="Need pro build ideas for Clockwerk? Check here dota2protracker.com/hero/Clockwerk "
      />
    ),
  },
  [Settings.commandDelay]: {
    key: Settings.commandDelay,
    title: 'Stream delay',
    description:
      'Tells chat the Dotabod bot delay you configured from the features page.',
    cmd: '!delay',
    alias: ['streamdelay'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command="!delay"
        response="Stream delay: 3 seconds"
      />
    ),
  },
}

export default CommandDetail
