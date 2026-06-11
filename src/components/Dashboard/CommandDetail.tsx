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
  commandAPM: {
    alias: [],
    allowed: 'all',
    cmd: '!apm',
    description: 'Actions per minute. A good indicator of speed and efficiency.',
    key: 'commandAPM',
    response: (props) => (
      <TwitchChat {...props} command='!apm' response='Live APM for Pudge: 123 Chatting' />
    ),
    title: 'APM',
  },
  commandAghs: {
    alias: [],
    allowed: 'all',
    cmd: '!aghs jug',
    description: "Provides information about the Aghanim's Scepter upgrade for a hero.",
    key: 'commandAghs',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!aghs'
        response='Juggernaut aghs: Swiftslash · Performs a short Omnislash for 1 seconds.'
      />
    ),
    title: "Aghanim's Scepter",
  },
  commandAvg: {
    alias: [],
    allowed: 'all',
    cmd: '!avg',
    description:
      'For the current game, show the average MMR of all players. Only works if not immortal.',
    key: 'commandAvg',
    response: (props) => (
      <TwitchChat {...props} command='!avg' response='3311 · Legend☆2 - Average rank this game' />
    ),
    title: 'Average MMR',
  },
  commandBeta: {
    alias: ['joinbeta', 'leavebeta', 'betaoff', 'betaon'],
    allowed: 'mods',
    cmd: '!beta',
    description:
      'Want to join the beta? You will get the latest features and updates before anyone else.',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!beta'
        response='<channel> is now a beta tester. Visit discord.dotabod.com to see the beta features. Type !beta to undo'
      />
    ),
    title: 'Dotabod Beta',
  },
  commandBuilds: {
    alias: ['dota2pt', 'build', 'd2pt', 'getbuild'],
    allowed: 'all',
    cmd: '!builds',
    description: 'Get a quick link to pro builds and guides for your currently playing hero.',
    key: 'commandBuilds',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!builds'
        response='Need pro build ideas for Pudge? Check here dota2protracker.com/hero/Pudge '
      />
    ),
    title: 'Dota 2 Pro Tracker',
  },
  commandCommands: {
    alias: [],
    allowed: 'all',
    cmd: '!commands',
    description:
      'All available commands with Dotabod. This list is filtered to only the commands you enabled. If a mod uses !commands, it will show mod only commands as well.',
    key: 'commandCommands',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!commands'
        responses={['Everyone can use: command1 · command2 · command3 · etc...']}
      />
    ),
    title: 'Command list',
  },
  commandCount: {
    allowed: 'all',
    cmd: '!count',
    description:
      'Debug command showing how many streamers are connected to the Dotabod GSI and overlay servers.',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!count'
        response='42 streamers connected to Dotabod GSI · 38 streamers using the overlay'
      />
    ),
    title: 'Connection count',
  },
  commandDelay: {
    alias: ['streamdelay'],
    allowed: 'all',
    cmd: '!delay',
    description: 'Tells chat the Dotabod bot delay you configured from the features page.',
    key: 'commandDelay',
    response: (props) => (
      <TwitchChat {...props} command='!delay' response='Stream delay: 3 seconds' />
    ),
    title: 'Stream delay',
  },
  commandDisable: {
    alias: ['enable', 'disable'],
    allowed: 'mods',
    cmd: '!toggle',
    description: 'Toggle to stop or start responding to game events and commands.',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!toggle'
        response='Dotabod is now disabled. Will no longer respond to commands nor watch game events. Type !toggle again to enable.'
      />
    ),
    title: 'Disable Dotabod',
  },
  commandDotabod: {
    alias: [],
    allowed: 'all',
    cmd: '!dotabod',
    description: "Tell everyone about the new bot you're using!",
    response: (props) => (
      <TwitchChat
        {...props}
        command='!dotabod'
        response={`I'm an open source bot made by @techleed. Get Dotabod for your stream: https://${window.location.host}`}
      />
    ),
    title: 'About',
  },
  commandDotabuff: {
    alias: [],
    allowed: 'all',
    cmd: '!dotabuff',
    description: 'Shows the Dotabuff link for your currently logged in steam account.',
    key: 'commandDotabuff',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!dotabuff'
        response="Here's <streamername>: dotabuff.com/players/1234567"
      />
    ),
    title: 'Dotabuff',
  },
  commandFixdbl: {
    alias: ['fixdd'],
    allowed: 'mods',
    cmd: '!fixdbl',
    description:
      'Toggles the doubledown status of the last match. Use this if Dotabod recorded a doubledown incorrectly.',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!fixdbl'
        response='Changing this match to double down mmr: dotabuff.com/matches/7654321 Type !fixdd to undo'
      />
    ),
    title: 'Fix double down',
  },
  commandFixparty: {
    alias: ['fixsolo'],
    allowed: 'mods',
    cmd: '!fixparty',
    description:
      "Dotabod can't detect party games right now (sadge). So if it does 25 mmr for a completed match, use !fixparty to adjust it to 20. You must type this after every party match.",
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
    title: 'Fix party match',
  },
  commandFriends: {
    allowed: 'mods',
    cmd: '!friends',
    description:
      'Admin-only command that returns the current match ID. Not available to regular mods or chatters.',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!friends' response='Match ID: 7654321' />
    ),
    title: 'Friends (admin)',
  },
  commandGM: {
    alias: ['medals', 'ranks'],
    allowed: 'all',
    cmd: '!gm',
    description:
      'Quickly show the ranks of all players in your match, giving your viewers deeper insight into each game.',
    key: 'commandGM',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!gm'
        response='Legion Commander: #856 · Dark Willow: #402 · Crystal Maiden: #321 · Weaver: #553 · Storm Spirit: #794 · Doom: #536 · Rubick: #524 · Dawnbreaker: #946 · Venomancer: #631 · Lifestealer: #294'
      />
    ),
    title: 'Game medals',
  },
  commandGPM: {
    alias: [],
    allowed: 'all',
    cmd: '!gpm',
    description:
      'At any time, chatters can request your live gold per minute with !gpm. Playing alch or anti-mage? Show off your gpm!',
    key: 'commandGPM',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!gpm'
        response='Live GPM for Pudge: 660. 5270 from hero kills, 9295 from creep kills.'
      />
    ),
    title: 'GPM',
  },
  commandGeo: {
    alias: ['country', 'location'],
    allowed: 'mods',
    cmd: '!geo',
    description: 'Shows the country flags of every player in the current match.',
    key: 'commandGeo',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!geo'
        response='Playing with players from 🇰🇷 🇷🇺 🇪🇪 🇺🇸 🇱🇧 🇺🇸 🇨🇳 🇩🇪 🇧🇷 🇸🇪'
      />
    ),
    title: 'Player countries',
  },
  commandHero: {
    alias: [],
    allowed: 'all',
    cmd: '!hero',
    description:
      "Shows currently playing hero's score in the last 30 days. Uses OpenDota API, so your profile must be public for this to work.",
    key: 'commandHero',
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
    title: 'Hero',
  },
  commandInnate: {
    alias: [],
    allowed: 'all',
    cmd: '!innate 4',
    description: "Provides information about a hero's innate ability.",
    key: 'commandInnate',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!innate'
        response="Juggernaut innate: Blade Dance · Juggernaut's attacks have a chance to deal critical damage."
      />
    ),
    title: 'Innate Ability',
  },
  commandItems: {
    alias: ['item'],
    allowed: 'all',
    cmd: '!items',
    description: 'Want to know what a hero, enemy or ally, has in their inventory?',
    key: 'commandItems',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!items marci'
        response='(2m delay) Marci has: Power Treads · Blink Dagger · Black King Bar · Skull Basher · Aegis of the Immortal · Battle Fury · Iron Branch · Magic Stick'
      />
    ),
    title: 'Get items',
  },
  commandLG: {
    alias: ['lastgame'],
    allowed: 'all',
    cmd: '!lg',
    description: "Find out if you're playing with anyone from your last match.",
    key: 'commandLG',
    response: (props) => (
      <TwitchChat {...props} command='!lg' response='Rubick was Crystal Maiden' />
    ),
    title: 'Last game',
  },
  commandLGS: {
    alias: ['lastgamescore', 'lgscore', 'lgwl'],
    allowed: 'all',
    cmd: '!lgs',
    description: 'Quickly see whether or not you won last game, duration, how long ago',
    key: 'commandLGS',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!lgs'
        response='Won last game · 6/3/12 on Pudge · 47m long · dotabuff.com/matches/6945205'
      />
    ),
    title: 'Last game score',
  },
  commandLastFm: {
    alias: ['lastfm', 'music', 'nowplaying'],
    allowed: 'all',
    cmd: '!song',
    description: 'Show what music you are currently listening to on Last.fm.',
    key: 'commandLastFm',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!song'
        response='Now playing: Artist Name - Track Title (Album Name)'
      />
    ),
    title: 'Last.fm Now Playing',
  },
  commandLocale: {
    alias: ['translation', 'translatedby'],
    allowed: 'all',
    cmd: '!locale',
    description: 'Tells chat the current locale of Dotabod.',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!locale'
        response='Dotabod is translated by Techleed. Want to help translate or see a mistake? https://crowdin.com/project/dotabod'
      />
    ),
    title: 'Locale',
  },
  commandLost: {
    allowed: 'mods',
    cmd: '!lost',
    description:
      'Manually resolve a bet as a loss when Dotabod disconnected before the match ended. Pass a match ID to resolve a specific past match (e.g. !lost 1234567).',
    key: 'commandLost',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!lost'
        response='Match 7654321 manually resolved as LOST by @mod'
      />
    ),
    title: 'Manual loss resolution',
  },
  commandMatch: {
    alias: ['matchid'],
    allowed: 'all',
    cmd: '!match',
    description: 'Shows the match ID of the current game.',
    response: (props) => <TwitchChat {...props} command='!match' response='Match ID: 7654321' />,
    title: 'Match ID',
  },
  commandMmr: {
    alias: ['rank', 'medal'],
    allowed: 'all',
    cmd: '!mmr',
    description:
      'Using chat command !mmr, viewers can get an accurate mmr update in chat. Auto updates immediately with every match!',
    key: 'commandMmr',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!mmr'
        response='2720 | Archon☆3 | Next rank at 2772 in 2 wins'
      />
    ),
    title: 'MMR',
  },
  commandModsonly: {
    alias: ['modsonlyoff', 'modsonlyon'],
    allowed: 'mods',
    cmd: '!modsonly',
    description:
      'Only allow mods to send messages in chat. Turns sub only mode on and deletes messages from subs.',
    key: 'commandModsonly',
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
    title: 'Mods only',
  },
  commandMute: {
    alias: ['unmute'],
    allowed: 'mods',
    cmd: '!mute',
    description:
      'Will prevent Dotabod from auto sending chatters, but will still respond to commands.',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!mute'
        response='Will no longer auto chat on game events, but will still respond to commands. Type !unmute to undo'
      />
    ),
    title: 'Mute Dotabod',
  },
  commandNP: {
    alias: [],
    allowed: 'all',
    cmd: '!np',
    description: 'Find out if your match has any pros.',
    key: 'commandNP',
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
    title: 'Notable players',
  },
  commandOnline: {
    alias: ['offline'],
    allowed: 'mods',
    cmd: '!online',
    description: 'Updates the status of your stream that Dotabod sees to online or offline.',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!online'
        response='Dotabod will treat <channel> as offline. Type !online to undo'
      />
    ),
    title: 'Online or offline status',
  },
  commandOnly: {
    allowed: 'mods',
    cmd: '!only',
    description:
      'Enables or disables verified mode. When enabled, only users with the specified rank or higher can chat.',
    key: 'commandOnly',
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
    title: 'Verified mode',
  },
  commandOpendota: {
    alias: [],
    allowed: 'all',
    cmd: '!opendota',
    description: 'Shows the Opendota link for your currently logged in steam account.',
    key: 'commandOpendota',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!opendota'
        response="Here's <streamername>: opendota.com/players/1234567"
      />
    ),
    title: 'Opendota',
  },
  commandPing: {
    alias: [],
    allowed: 'all',
    cmd: '!ping',
    description: 'If Dotabod responds with Pong, that means the servers are operating normally.',
    response: (props) => <TwitchChat {...props} command='!ping' response='Pong EZ Clap' />,
    title: 'Ping',
  },
  commandPleb: {
    alias: [],
    allowed: 'mods',
    cmd: '!pleb',
    description:
      'When you have sub only mode turned on, use !pleb to let one non-sub send a message. Then all your subs can point and laugh 😂.',
    key: 'commandPleb',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!pleb' response='One pleb IN 👇' />
    ),
    title: 'Pleb',
  },
  commandProfile: {
    alias: [],
    allowed: 'all',
    cmd: '!profile',
    description: 'Shows the profile link for the hero color you specify during a live match.',
    key: 'commandProfile',
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
    title: 'Profile',
  },
  commandRanked: {
    alias: ['isranked'],
    allowed: 'all',
    cmd: '!ranked',
    description: 'Chatters can find out if this match is ranked or not.',
    key: 'commandRanked',
    response: (props) => (
      <TwitchChat {...props} command='!ranked' response='Yes this game is ranked' />
    ),
    title: 'Ranked or not?',
  },
  commandRecent: {
    alias: ['history', 'matches'],
    allowed: 'mods',
    cmd: '!recent',
    description:
      'Lists the last 5 resolved matches from this stream with their match IDs, hero, and result. Shares the toggle with !won.',
    key: 'commandWon',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!recent'
        response='Recent matches: 7654321 W (Pudge), 7654320 L (Invoker), 7654319 W (Sniper) 👌'
      />
    ),
    title: 'Recent matches',
  },
  commandRefresh: {
    alias: [],
    allowed: 'mods',
    cmd: '!refresh',
    description:
      'Refreshes your OBS overlay without having to do it from OBS. Used in case the overlay is messed up.',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!refresh' response='Refreshing overlay...' />
    ),
    title: 'Refresh',
  },
  commandResetwl: {
    alias: [],
    allowed: 'mods',
    cmd: '!resetwl',
    description: 'Resets your win losses to 0-0.',
    response: (props) => (
      <TwitchChat {...props} command='!resetwl' response='Resetting win/loss to 0 for <channel>' />
    ),
    title: 'Reset win loss',
  },
  commandRosh: {
    alias: ['roshan', 'aegis'],
    allowed: 'all',
    cmd: '!rosh',
    description: 'Tells chat the current roshan and aegis status.',
    key: 'commandRosh',
    response: (props) => (
      <TwitchChat {...props} command='!rosh' response={chatterInfo.roshanKilled.message} />
    ),
    title: 'Roshan and aegis',
  },
  commandSet: {
    alias: ['cosmetics', 'loadout'],
    allowed: 'all',
    cmd: '!set',
    description:
      "Shows your current hero's equipped cosmetics with a link to your public collection page. Loadouts are captured automatically as you pick heroes on stream.",
    key: 'commandSet',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!set'
        response='Pudge has 5 equipped cosmetics → dotabod.com/<streamername>/set'
      />
    ),
    title: 'Cosmetic set',
  },
  commandSetdelay: {
    alias: ['delay=', 'setstreamdelay', 'streamdelay='],
    allowed: 'mods',
    cmd: '!setdelay 3',
    description:
      'Configures the Dotabod chat-delay buffer (in seconds). Use !setdelay 0 to remove the delay.',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!setdelay 3'
        response='Setting stream delay to: 3 seconds'
      />
    ),
    title: 'Set stream delay',
  },
  commandSetmmr: {
    alias: ['mmr=', 'mmrset'],
    allowed: 'mods',
    cmd: '!setmmr',
    description: 'Manually set your MMR.',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!setmmr 1234' response='Updated MMR to 1234' />
    ),
    title: 'Set MMR',
  },
  commandShard: {
    alias: [],
    allowed: 'all',
    cmd: '!shard jug',
    description: "Provides information about the Aghanim's Shard upgrade for a hero.",
    key: 'commandShard',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!shard'
        response='Juggernaut shard: Blade Fury · Increases Blade Fury radius, and slows enemies by 35%.'
      />
    ),
    title: "Aghanim's Shard",
  },
  commandSmurfs: {
    alias: ['lifetimes', 'totals', 'games', 'smurf'],
    allowed: 'all',
    cmd: '!smurfs',
    description: 'Shows total games played for each player in the match.',
    key: 'commandSmurfs',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!smurfs'
        response='Lifetime games: Viper: 408 · Doom: 657 · Hoodwink: 2,243 · Lina: 2,735 · Sniper: 2,850 · Drow Ranger: 3,136 · Clinkz: 3,384 · Tusk: 4,202 · Pugna: 4,466 · Dazzle: 6,626'
      />
    ),
    title: 'Smurfs',
  },
  commandSpectators: {
    alias: ['specs'],
    allowed: 'all',
    cmd: '!spectators',
    description: 'Displays the number of spectators currently watching the match live.',
    key: 'commandSpectators',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!spectators'
        response='15 spectators watching this match live'
      />
    ),
    title: 'Spectator Count',
  },
  commandStats: {
    alias: ['stat', 'kda', 'lh', 'gold', 'networth', 'level'],
    allowed: 'all',
    cmd: '!stats',
    description:
      'Shows live KDA, last hits, denies, gold, net worth, and level for a hero in the current match. Shares the toggle with !items.',
    key: 'commandItems',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!stats marci'
        response='(2m delay) Marci: KDA 8/2/14 · LH 142 · DN 11 · G 1,820 · NW 18,400 · LVL 21'
      />
    ),
    title: 'Live hero stats',
  },
  commandSteam: {
    alias: ['steamid', 'account'],
    allowed: 'mods',
    cmd: '!steam',
    description: "Retrieve the steam ID of the account you're currently playing on.",
    key: 'commandSteam',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!steam' response='steamid.xyz/1234567' />
    ),
    title: 'Steam ID',
  },
  commandStreamers: {
    alias: [],
    allowed: 'all',
    cmd: '!streamers',
    description:
      'Anonymously tells chat how many other Dotabod streamers are in your current match. No names are shown to avoid cross-chat drama.',
    key: 'commandStreamers',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!streamers'
        response='Playing with 2 other Dotabod streamers Okayge'
      />
    ),
    title: 'Streamers in match',
  },
  commandTest: {
    allowed: 'mods',
    cmd: '!test',
    description:
      'Admin-only debug command used by Dotabod developers. Not available to regular mods or chatters.',
    response: (props) => (
      <TwitchChat {...props} modOnly command='!test' response='cards! 7654321' />
    ),
    title: 'Test (admin)',
  },
  commandToday: {
    alias: ['td'],
    allowed: 'all',
    cmd: '!today',
    description: 'Shows wins and losses per hero played today.',
    key: 'commandToday',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!today'
        response='Pudge 2-1 · Invoker 1-0 · Sniper 0-2 · 3W 3L (6 games)'
      />
    ),
    title: "Today's hero stats",
  },
  commandUnresolved: {
    alias: ['pending'],
    allowed: 'mods',
    cmd: '!unresolved',
    description:
      'Lists matches from this stream that have no win/loss recorded yet. Use !won or !lost with the match ID to resolve. Shares the toggle with !won.',
    key: 'commandWon',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!unresolved'
        response='2 unresolved match(es) 👌 Use !won or !lost with match ID: 7654321 (Pudge), 7654320 (Invoker)'
      />
    ),
    title: 'Unresolved matches',
  },
  commandVersion: {
    alias: [],
    allowed: 'all',
    cmd: '!version',
    description: 'Tells chat the current running version of Dotabod.',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!version'
        response="Server running version 2c4fa, here's what's missing compared to the latest version: https://github.com/dotabod/backend/compare/2c4fa...latest"
      />
    ),
    title: 'Version',
  },
  commandWL: {
    alias: ['score', 'winrate', 'wr'],
    allowed: 'all',
    cmd: '!wl',
    description:
      'Says the total wins and losses for current stream duration. Disabling this command will hide these statistics in the stream overlay.',
    key: 'commandWL',
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
    title: 'Win / Loss',
  },
  commandWinProbability: {
    alias: ['winprobability', 'win%'],
    allowed: 'all',
    cmd: '!wp',
    description: 'Shows the current win probability for the game.',
    key: 'commandWinProbability',
    response: (props) => (
      <TwitchChat
        {...props}
        command='!wp'
        response='75% win probability at 30:00 · Next update in 60s'
      />
    ),
    title: 'Win Probability',
  },
  commandWon: {
    allowed: 'mods',
    cmd: '!won',
    description:
      'Manually resolve a bet as a win when Dotabod disconnected before the match ended. Pass a match ID to resolve a specific past match (e.g. !won 1234567).',
    key: 'commandWon',
    response: (props) => (
      <TwitchChat
        {...props}
        modOnly
        command='!won'
        response='Match 7654321 manually resolved as WON by @mod'
      />
    ),
    title: 'Manual win resolution',
  },
  commandXPM: {
    alias: [],
    allowed: 'all',
    cmd: '!xpm',
    description: 'Live experience per minute for your chatters on demand.',
    key: 'commandXPM',
    response: (props) => (
      <TwitchChat {...props} command='!xpm' response='Live XPM for Pudge: 778' />
    ),
    title: 'XPM',
  },
}

export default CommandDetail
