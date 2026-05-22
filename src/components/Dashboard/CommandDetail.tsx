import Image from 'next/image'
import { chatterInfo } from '@/components/Dashboard/Features/ChatterCard'
import TwitchChat from '@/components/TwitchChat'
import type { CommandKeys, commands } from '@/lib/defaultSettings'

const CommandDetail: Record<
  CommandKeys,
  {
    title: string
    description: string
    cmd: string
    // The existance means they can toggle it on and off
    key?: keyof typeof commands
    alias?: string[]
    allowed: 'mods' | 'all'
    response: (props?: Record<string, unknown> | null, all?: boolean) => React.ReactNode
  }
> = {
  commandDisable: {
    title: 'Disable Dotabod',
    description: 'Toggle to stop or start responding to game events and commands.',
    cmd: '!toggle',
    alias: ['enable', 'disable'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!toggle'
        response='Dotabod is now disabled. Will no longer respond to commands nor watch game events. Type !toggle again to enable.'
      />
    ),
  },
  commandOnline: {
    title: 'Online or offline status',
    description: 'Updates the status of your stream that Dotabod sees to online or offline.',
    cmd: '!online',
    alias: ['offline'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!online'
        response='Dotabod will treat <channel> as offline. Type !online to undo'
      />
    ),
  },
  commandMute: {
    title: 'Mute Dotabod',
    description:
      'Will prevent Dotabod from auto sending chatters, but will still respond to commands.',
    cmd: '!mute',
    alias: ['unmute'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!mute'
        response='Will no longer auto chat on game events, but will still respond to commands. Type !unmute to undo'
      />
    ),
  },
  commandFixparty: {
    title: 'Fix party match',
    description:
      "Dotabod can't detect party games right now (sadge). So if it does 25 mmr for a completed match, use !fixparty to adjust it to 20. You must type this after every party match.",
    cmd: '!fixparty',
    alias: ['fixsolo'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!fixparty'
        modOnly
        responses={[
          'Changing this match to party mmr: dotabuff.com/matches/1234567 Type !fixparty to undo',
          'Updated MMR to 3090',
        ]}
      />
    ),
  },
  commandRefresh: {
    title: 'Refresh',
    description:
      'Refreshes your OBS overlay without having to do it from OBS. Used in case the overlay is messed up.',
    cmd: '!refresh',
    alias: [],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!refresh' response='Refreshing overlay...' />
    ),
  },
  commandSteam: {
    key: 'commandSteam',
    title: 'Steam ID',
    description: "Retrieve the steam ID of the account you're currently playing on.",
    cmd: '!steam',
    alias: ['steamid', 'account'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!steam' response='steamid.xyz/1234567' />
    ),
  },
  commandSetmmr: {
    title: 'Set MMR',
    description: 'Manually set your MMR.',
    cmd: '!setmmr',
    alias: ['mmr=', 'mmrset'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!setmmr 1234' response='Updated MMR to 1234' />
    ),
  },
  commandBeta: {
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
        command='!beta'
        response='<channel> is now a beta tester. Visit discord.dotabod.com to see the beta features. Type !beta to undo'
      />
    ),
  },
  commandPleb: {
    key: 'commandPleb',
    title: 'Pleb',
    description:
      'When you have sub only mode turned on, use !pleb to let one non-sub send a message. Then all your subs can point and laugh 😂.',
    cmd: '!pleb',
    alias: [],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!pleb' response='One pleb IN 👇' />
    ),
  },
  commandModsonly: {
    key: 'commandModsonly',
    title: 'Mods only',
    description:
      'Only allow mods to send messages in chat. Turns sub only mode on and deletes messages from subs.',
    cmd: '!modsonly',
    alias: ['modsonlyoff', 'modsonlyon'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!modsonly'
        response={
          <>
            Mods only mode is now on
            <Image
              src='https://cdn.betterttv.net/emote/61e918ab06fd6a9f5be168f3/1x.webp'
              width={24}
              height={24}
              alt='based'
              className='ml-1 mr-1 inline'
            />
            <Image
              src='https://cdn.betterttv.net/emote/55b6f480e66682f576dd94f5/1x.webp'
              width={24}
              height={24}
              alt='clap'
              className='ml-1 mr-1 inline'
            />
            . Only mods can type.
          </>
        }
      />
    ),
  },
  commandCommands: {
    key: 'commandCommands',
    title: 'Command list',
    description:
      'All available commands with Dotabod. This list is filtered to only the commands you enabled. If a mod uses !commands, it will show mod only commands as well.',
    cmd: '!commands',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!commands'
        responses={['Everyone can use: command1 · command2 · command3 · etc...']}
      />
    ),
  },
  commandRanked: {
    key: 'commandRanked',
    title: 'Ranked or not?',
    description: 'Chatters can find out if this match is ranked or not.',
    cmd: '!ranked',
    alias: ['isranked'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command='!ranked' response='Yes this game is ranked' />
    ),
  },
  commandAvg: {
    key: 'commandAvg',
    title: 'Average MMR',
    description:
      'For the current game, show the average MMR of all players. Only works if not immortal.',
    cmd: '!avg',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command='!avg' response='3311 · Legend☆2 - Average rank this game' />
    ),
  },
  commandOpendota: {
    key: 'commandOpendota',
    title: 'Opendota',
    description: 'Shows the Opendota link for your currently logged in steam account.',
    cmd: '!opendota',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!opendota'
        response="Here's <streamername>: opendota.com/players/1234567"
      />
    ),
  },

  commandDotabuff: {
    key: 'commandDotabuff',
    title: 'Dotabuff',
    description: 'Shows the Dotabuff link for your currently logged in steam account.',
    cmd: '!dotabuff',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!dotabuff'
        response="Here's <streamername>: dotabuff.com/players/1234567"
      />
    ),
  },
  commandXPM: {
    key: 'commandXPM',
    title: 'XPM',
    description: 'Live experience per minute for your chatters on demand.',
    cmd: '!xpm',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command='!xpm' response='Live XPM for Pudge: 778' />
    ),
  },
  commandWL: {
    key: 'commandWL',
    title: 'Win / Loss',
    description:
      'Says the total wins and losses for current stream duration. Disabling this command will hide these statistics in the stream overlay.',
    cmd: '!wl',
    alias: ['score', 'winrate', 'wr'],
    allowed: 'all',
    response: (props, all = true) => (
      <>
        <TwitchChat {...props} command='!wl' response='Ranked 0 W - 9 L | -270 MMR' />
        {all && (
          <TwitchChat
            {...props}
            command='!wl'
            response='Ranked 0 W - 9 L | -270 MMR | Unranked 2 W - 1 L'
          />
        )}
      </>
    ),
  },
  commandMmr: {
    key: 'commandMmr',
    title: 'MMR',
    description:
      'Using chat command !mmr, viewers can get an accurate mmr update in chat. Auto updates immediately with every match!',
    cmd: '!mmr',
    alias: ['rank', 'medal'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!mmr'
        response='2720 | Archon☆3 | Next rank at 2772 in 2 wins'
      />
    ),
  },
  commandGPM: {
    key: 'commandGPM',
    title: 'GPM',
    description:
      'At any time, chatters can request your live gold per minute with !gpm. Playing alch or anti-mage? Show off your gpm!',
    cmd: '!gpm',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!gpm'
        response='Live GPM for Pudge: 660. 5270 from hero kills, 9295 from creep kills.'
      />
    ),
  },
  commandAPM: {
    key: 'commandAPM',
    title: 'APM',
    description: 'Actions per minute. A good indicator of speed and efficiency.',
    cmd: '!apm',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command='!apm' response='Live APM for Pudge: 123 Chatting' />
    ),
  },

  commandNP: {
    key: 'commandNP',
    title: 'Notable players',
    description: 'Find out if your match has any pros.',
    cmd: '!np',
    alias: [],
    allowed: 'all',
    response: (props, all = true) => (
      <div className='space-y-6'>
        <TwitchChat
          {...props}
          command='!np'
          response={
            <>
              All Pick:
              <Image
                src='/images/flags/south-korea.png'
                width={24}
                height={24}
                alt='south korea'
                className='ml-1 mr-1 inline'
              />
              DuBu (Shadow Shaman) ·
              <Image
                src='/images/flags/russia.png'
                width={24}
                height={24}
                alt='russia'
                className='ml-1 mr-1 inline'
              />
              Collapse (Magnus) ·
              <Image
                src='/images/flags/estonia.png'
                width={24}
                height={24}
                alt='estonia'
                className='ml-1 mr-1 inline'
              />
              Puppy (Chen) ·
              <Image
                src='/images/flags/usa.png'
                width={24}
                height={24}
                alt='usa'
                className='ml-1 mr-1 inline'
              />
              PPD (Tusk) ·
              <Image
                src='/images/flags/lebanon.png'
                width={24}
                height={24}
                alt='usa'
                className='ml-1 mr-1 inline'
              />
              Rajjix (Timbersaw)
            </>
          }
        />
        {all && (
          <>
            <TwitchChat
              {...props}
              command='!np add'
              response='Try !np add <steam32id> <playername>'
            />
            <TwitchChat {...props} command='!np remove' response='Try !np remove <steam32id>' />
          </>
        )}
      </div>
    ),
  },
  commandSmurfs: {
    key: 'commandSmurfs',
    title: 'Smurfs',
    description: 'Shows total games played for each player in the match.',
    cmd: '!smurfs',
    alias: ['lifetimes', 'totals', 'games', 'smurf'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!smurfs'
        response='Lifetime games: Viper: 408 · Doom: 657 · Hoodwink: 2,243 · Lina: 2,735 · Sniper: 2,850 · Drow Ranger: 3,136 · Clinkz: 3,384 · Tusk: 4,202 · Pugna: 4,466 · Dazzle: 6,626'
      />
    ),
  },
  commandGM: {
    key: 'commandGM',
    title: 'Game medals',
    description:
      'Quickly show the ranks of all players in your match, giving your viewers deeper insight into each game.',
    cmd: '!gm',
    alias: ['medals', 'ranks'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!gm'
        response='Legion Commander: #856 · Dark Willow: #402 · Crystal Maiden: #321 · Weaver: #553 · Storm Spirit: #794 · Doom: #536 · Rubick: #524 · Dawnbreaker: #946 · Venomancer: #631 · Lifestealer: #294'
      />
    ),
  },
  commandLG: {
    key: 'commandLG',
    title: 'Last game',
    description: "Find out if you're playing with anyone from your last match.",
    cmd: '!lg',
    alias: ['lastgame'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command='!lg' response='Rubick was Crystal Maiden' />
    ),
  },
  commandPing: {
    title: 'Ping',
    description: 'If Dotabod responds with Pong, that means the servers are operating normally.',
    cmd: '!ping',
    alias: [],
    allowed: 'all',
    response: (props) => <TwitchChat {...props} command='!ping' response='Pong EZ Clap' />,
  },
  commandDotabod: {
    title: 'About',
    description: "Tell everyone about the new bot you're using!",
    cmd: '!dotabod',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!dotabod'
        response={`I'm an open source bot made by @techleed. Get Dotabod for your stream: https://${window.location.host}`}
      />
    ),
  },
  commandLGS: {
    key: 'commandLGS',
    title: 'Last game score',
    description: 'Quickly see whether or not you won last game, duration, how long ago',
    cmd: '!lgs',
    alias: ['lastgamescore', 'lgscore', 'lgwl'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!lgs'
        response='Won last game · 6/3/12 on Pudge · 47m long · dotabuff.com/matches/6945205'
      />
    ),
  },
  commandProfile: {
    key: 'commandProfile',
    title: 'Profile',
    description: 'Shows the profile link for the hero color you specify during a live match.',
    cmd: '!profile',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <>
        <TwitchChat
          {...props}
          command='!profile blue'
          response="Here's blue: dotabuff.com/players/1234567"
        />
        <TwitchChat
          {...props}
          command='!profile ?'
          response='Invalid hero color, slot, or name. Try 1-10, a partial hero name, or a color from Blue Teal Purple Yellow Orange Pink Olive Light Blue Green Brown'
        />
      </>
    ),
  },
  commandHero: {
    key: 'commandHero',
    title: 'Hero',
    description:
      "Shows currently playing hero's score in the last 30 days. Uses OpenDota API, so your profile must be public for this to work.",
    cmd: '!hero',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <>
        <TwitchChat {...props} command='!hero' response='No matches played as Pudge in 30d' />
        <TwitchChat
          {...props}
          command='!hero'
          response='Winrate is 53% on Pudge in 30d from 41 matches.'
        />
      </>
    ),
  },
  commandBuilds: {
    key: 'commandBuilds',
    title: 'Dota 2 Pro Tracker',
    description: 'Get a quick link to pro builds and guides for your currently playing hero.',
    cmd: '!builds',
    alias: ['dota2pt', 'build', 'd2pt', 'getbuild'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!builds'
        response='Need pro build ideas for Pudge? Check here dota2protracker.com/hero/Pudge '
      />
    ),
  },
  commandDelay: {
    key: 'commandDelay',
    title: 'Stream delay',
    description: 'Tells chat the Dotabod bot delay you configured from the features page.',
    cmd: '!delay',
    alias: ['streamdelay'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command='!delay' response='Stream delay: 3 seconds' />
    ),
  },
  commandRosh: {
    key: 'commandRosh',
    title: 'Roshan and aegis',
    description: 'Tells chat the current roshan and aegis status.',
    cmd: '!rosh',
    alias: ['roshan', 'aegis'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat {...props} command='!rosh' response={chatterInfo.roshanKilled.message} />
    ),
  },
  commandItems: {
    key: 'commandItems',
    title: 'Get items',
    description: 'Want to know what a hero, enemy or ally, has in their inventory?',
    cmd: '!items',
    alias: ['item'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!items marci'
        response='(2m delay) Marci has: Power Treads · Blink Dagger · Black King Bar · Skull Basher · Aegis of the Immortal · Battle Fury · Iron Branch · Magic Stick'
      />
    ),
  },
  commandVersion: {
    title: 'Version',
    description: 'Tells chat the current running version of Dotabod.',
    cmd: '!version',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!version'
        response="Server running version 2c4fa, here's what's missing compared to the latest version: https://github.com/dotabod/backend/compare/2c4fa...latest"
      />
    ),
  },
  commandResetwl: {
    title: 'Reset win loss',
    description: 'Resets your win losses to 0-0.',
    cmd: '!resetwl',
    allowed: 'mods',
    alias: [],
    response: (props) => (
      <TwitchChat {...props} command='!resetwl' response='Resetting win/loss to 0 for <channel>' />
    ),
  },
  commandLocale: {
    title: 'Locale',
    description: 'Tells chat the current locale of Dotabod.',
    cmd: '!locale',
    alias: ['translation', 'translatedby'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!locale'
        response='Dotabod is translated by Techleed. Want to help translate or see a mistake? https://crowdin.com/project/dotabod'
      />
    ),
  },
  commandWinProbability: {
    key: 'commandWinProbability',
    title: 'Win Probability',
    description: 'Shows the current win probability for the game.',
    cmd: '!wp',
    alias: ['winprobability', 'win%'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!wp'
        response='75% win probability at 30:00 · Next update in 60s'
      />
    ),
  },
  commandSpectators: {
    key: 'commandSpectators',
    title: 'Spectator Count',
    description: 'Displays the number of spectators currently watching the match live.',
    cmd: '!spectators',
    alias: ['specs'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!spectators'
        response='15 spectators watching this match live'
      />
    ),
  },
  commandInnate: {
    key: 'commandInnate',
    title: 'Innate Ability',
    description: "Provides information about a hero's innate ability.",
    cmd: '!innate 4',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!innate'
        response="Juggernaut innate: Blade Dance · Juggernaut's attacks have a chance to deal critical damage."
      />
    ),
  },
  commandShard: {
    key: 'commandShard',
    title: "Aghanim's Shard",
    description: "Provides information about the Aghanim's Shard upgrade for a hero.",
    cmd: '!shard jug',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!shard'
        response='Juggernaut shard: Blade Fury · Increases Blade Fury radius, and slows enemies by 35%.'
      />
    ),
  },
  commandAghs: {
    key: 'commandAghs',
    title: "Aghanim's Scepter",
    description: "Provides information about the Aghanim's Scepter upgrade for a hero.",
    cmd: '!aghs jug',
    alias: [],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!aghs'
        response='Juggernaut aghs: Swiftslash · Performs a short Omnislash for 1 seconds.'
      />
    ),
  },
  commandLastFm: {
    key: 'commandLastFm',
    title: 'Last.fm Now Playing',
    description: 'Show what music you are currently listening to on Last.fm.',
    cmd: '!song',
    alias: ['lastfm', 'music', 'nowplaying'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!song'
        response='Now playing: Artist Name - Track Title (Album Name)'
      />
    ),
  },
  commandOnly: {
    key: 'commandOnly',
    title: 'Verified mode',
    description:
      'Enables or disables verified mode. When enabled, only users with the specified rank or higher can chat.',
    cmd: '!only',
    allowed: 'mods',
    response: (props) => (
      <div className='space-y-6'>
        <TwitchChat
          {...props}
          modOnly
          command='!only immortal'
          response='Verified mode is now enabled. Only Immortal or higher ranks can chat. Visit dotabod.com/verified to become Dotabod verified.'
        />
        <TwitchChat
          {...props}
          modOnly
          command='!only off'
          response='Verified mode is now disabled. Everyone can chat.'
        />
        <TwitchChat
          {...props}
          modOnly
          command='!only status'
          response='Verified mode is currently enabled. Only Immortal+ ranks can chat. Visit dotabod.com/verified to become Dotabod verified.'
        />
      </div>
    ),
  },
  commandGeo: {
    key: 'commandGeo',
    title: 'Player countries',
    description: 'Shows the country flags of every player in the current match.',
    cmd: '!geo',
    alias: ['country', 'location'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!geo'
        response='Playing with players from 🇰🇷 🇷🇺 🇪🇪 🇺🇸 🇱🇧 🇺🇸 🇨🇳 🇩🇪 🇧🇷 🇸🇪'
      />
    ),
  },
  commandLost: {
    key: 'commandLost',
    title: 'Manual loss resolution',
    description:
      'Manually resolve a bet as a loss when Dotabod disconnected before the match ended. Pass a match ID to resolve a specific past match (e.g. !lost 1234567).',
    cmd: '!lost',
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!lost'
        response='Match 7654321 manually resolved as LOST by @mod'
      />
    ),
  },
  commandWon: {
    key: 'commandWon',
    title: 'Manual win resolution',
    description:
      'Manually resolve a bet as a win when Dotabod disconnected before the match ended. Pass a match ID to resolve a specific past match (e.g. !won 1234567).',
    cmd: '!won',
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!won'
        response='Match 7654321 manually resolved as WON by @mod'
      />
    ),
  },
  commandToday: {
    key: 'commandToday',
    title: "Today's hero stats",
    description: 'Shows wins and losses per hero played today.',
    cmd: '!today',
    alias: ['td'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!today'
        response='Pudge 2-1 · Invoker 1-0 · Sniper 0-2 · 3W 3L (6 games)'
      />
    ),
  },
  commandRecent: {
    key: 'commandWon',
    title: 'Recent matches',
    description:
      'Lists the last 5 resolved matches from this stream with their match IDs, hero, and result. Shares the toggle with !won.',
    cmd: '!recent',
    alias: ['history', 'matches'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!recent'
        response='Recent matches: 7654321 W (Pudge), 7654320 L (Invoker), 7654319 W (Sniper) 👌'
      />
    ),
  },
  commandUnresolved: {
    key: 'commandWon',
    title: 'Unresolved matches',
    description:
      'Lists matches from this stream that have no win/loss recorded yet. Use !won or !lost with the match ID to resolve. Shares the toggle with !won.',
    cmd: '!unresolved',
    alias: ['pending'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!unresolved'
        response='2 unresolved match(es) 👌 Use !won or !lost with match ID: 7654321 (Pudge), 7654320 (Invoker)'
      />
    ),
  },
  commandStats: {
    key: 'commandItems',
    title: 'Live hero stats',
    description:
      'Shows live KDA, last hits, denies, gold, net worth, and level for a hero in the current match. Shares the toggle with !items.',
    cmd: '!stats',
    alias: ['stat', 'kda', 'lh', 'gold', 'networth', 'level'],
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!stats marci'
        response='(2m delay) Marci: KDA 8/2/14 · LH 142 · DN 11 · G 1,820 · NW 18,400 · LVL 21'
      />
    ),
  },
  commandMatch: {
    title: 'Match ID',
    description: 'Shows the match ID of the current game.',
    cmd: '!match',
    alias: ['matchid'],
    allowed: 'all',
    response: (props) => <TwitchChat {...props} command='!match' response='Match ID: 7654321' />,
  },
  commandSetdelay: {
    title: 'Set stream delay',
    description:
      'Configures the Dotabod chat-delay buffer (in seconds). Use !setdelay 0 to remove the delay.',
    cmd: '!setdelay 3',
    alias: ['delay=', 'setstreamdelay', 'streamdelay='],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!setdelay 3'
        response='Setting stream delay to: 3 seconds'
      />
    ),
  },
  commandFixdbl: {
    title: 'Fix double down',
    description:
      'Toggles the doubledown status of the last match. Use this if Dotabod recorded a doubledown incorrectly.',
    cmd: '!fixdbl',
    alias: ['fixdd'],
    allowed: 'mods',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!fixdbl'
        response='Changing this match to double down mmr: dotabuff.com/matches/7654321 Type !fixdd to undo'
      />
    ),
  },
  commandFriends: {
    title: 'Friends (admin)',
    description:
      'Admin-only command that returns the current match ID. Not available to regular mods or chatters.',
    cmd: '!friends',
    allowed: 'mods',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!friends' response='Match ID: 7654321' />
    ),
  },
  commandTest: {
    title: 'Test (admin)',
    description:
      'Admin-only debug command used by Dotabod developers. Not available to regular mods or chatters.',
    cmd: '!test',
    allowed: 'mods',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!test' response='cards! 7654321' />
    ),
  },
  commandCount: {
    title: 'Connection count',
    description:
      'Debug command showing how many streamers are connected to the Dotabod GSI and overlay servers.',
    cmd: '!count',
    allowed: 'all',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!count'
        response='42 streamers connected to Dotabod GSI · 38 streamers using the overlay'
      />
    ),
  },
}

export default CommandDetail
