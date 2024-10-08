import { chatterInfo } from '@/components/Dashboard/Features/ChatterCard'
import TwitchChat from '@/components/TwitchChat'
import { Settings } from '@/lib/defaultSettings'
import Image from 'next/image'
import { useTranslation } from 'next-i18next'

const CommandDetail = () => {
  const { t } = useTranslation('common')

  return {
    [Settings.commandDisable]: {
      title: t('commandDisable.title'),
      description: t('commandDisable.description'),
      cmd: '!toggle',
      alias: ['enable', 'disable'],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          modOnly
          command="!toggle"
          response={t('commandDisable.response')}
        />
      ),
    },
    [Settings.commandOnline]: {
      title: t('commandOnline.title'),
      description: t('commandOnline.description'),
      cmd: '!online',
      alias: ['offline', 'forceonline', 'forceoffline'],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!online"
          response={t('commandOnline.response')}
        />
      ),
    },
    [Settings.chatter]: {
      title: t('chatter.title'),
      description: t('chatter.description'),
      cmd: '!mute',
      alias: ['unmute'],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          modOnly
          command="!mute"
          response={t('chatter.response')}
        />
      ),
    },
    fixparty: {
      title: t('fixparty.title'),
      description: t('fixparty.description'),
      cmd: '!fixparty',
      alias: ['fixsolo'],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!fixparty"
          modOnly
          responses={t('fixparty.responses')}
        />
      ),
    },
    refresh: {
      title: t('refresh.title'),
      description: t('refresh.description'),
      cmd: '!refresh',
      alias: [],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          modOnly
          command="!refresh"
          response={t('refresh.response')}
        />
      ),
    },
    [Settings.commandSteam]: {
      key: Settings.commandSteam,
      title: t('commandSteam.title'),
      description: t('commandSteam.description'),
      cmd: '!steam',
      alias: ['steamid', 'account'],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          modOnly
          command="!steam"
          response={t('commandSteam.response')}
        />
      ),
    },
    setmmr: {
      title: t('setmmr.title'),
      description: t('setmmr.description'),
      cmd: '!setmmr',
      alias: ['mmr=', 'mmrset'],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          modOnly
          command="!setmmr 1234"
          response={t('setmmr.response')}
        />
      ),
    },
    beta: {
      title: t('beta.title'),
      description: t('beta.description'),
      cmd: '!beta',
      alias: ['joinbeta', 'leavebeta', 'betaoff', 'betaon'],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          modOnly
          command="!beta"
          response={t('beta.response')}
        />
      ),
    },
    [Settings.commandPleb]: {
      key: Settings.commandPleb,
      title: t('commandPleb.title'),
      description: t('commandPleb.description'),
      cmd: '!pleb',
      alias: [],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          modOnly
          command="!pleb"
          response={t('commandPleb.response')}
        />
      ),
    },
    [Settings.commandModsonly]: {
      key: Settings.commandModsonly,
      title: t('commandModsonly.title'),
      description: t('commandModsonly.description'),
      cmd: '!modsonly',
      alias: [],
      allowed: 'mods',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          modOnly
          command="!modsonly"
          response={
            <>
              {t('commandModsonly.response')}
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
            </>
          }
        />
      ),
    },
    [Settings.commandCommands]: {
      key: Settings.commandCommands,
      title: t('commandCommands.title'),
      description: t('commandCommands.description'),
      cmd: '!commands',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!commands"
          responses={t('commandCommands.responses')}
        />
      ),
    },
    [Settings.commandRanked]: {
      key: Settings.commandRanked,
      title: t('commandRanked.title'),
      description: t('commandRanked.description'),
      cmd: '!ranked',
      alias: ['isranked'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!ranked"
          response={t('commandRanked.response')}
        />
      ),
    },
    [Settings.commandAvg]: {
      key: Settings.commandAvg,
      title: t('commandAvg.title'),
      description: t('commandAvg.description'),
      cmd: '!avg',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!avg"
          response={t('commandAvg.response')}
        />
      ),
    },
    [Settings.commandOpendota]: {
      key: Settings.commandOpendota,
      title: t('commandOpendota.title'),
      description: t('commandOpendota.description'),
      cmd: '!opendota',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!opendota"
          response={t('commandOpendota.response')}
        />
      ),
    },
    [Settings.commandDotabuff]: {
      key: Settings.commandDotabuff,
      title: t('commandDotabuff.title'),
      description: t('commandDotabuff.description'),
      cmd: '!dotabuff',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!dotabuff"
          response={t('commandDotabuff.response')}
        />
      ),
    },
    [Settings.commandXPM]: {
      key: Settings.commandXPM,
      title: t('commandXPM.title'),
      description: t('commandXPM.description'),
      cmd: '!xpm',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat {...props} command="!xpm" response={t('commandXPM.response')} />
      ),
    },
    [Settings.commandWL]: {
      key: Settings.commandWL,
      title: t('commandWL.title'),
      description: t('commandWL.description'),
      cmd: '!wl',
      alias: ['score', 'winrate', 'wr'],
      allowed: 'all',
      response: (props: Record<string, any> = {}, all = true) => (
        <>
          <TwitchChat
            {...props}
            command="!wl"
            response={t('commandWL.response1')}
          />
          {all && (
            <TwitchChat
              {...props}
              command="!wl"
              response={t('commandWL.response2')}
            />
          )}
        </>
      ),
    },
    [Settings.commandMmr]: {
      key: Settings.commandMmr,
      title: t('commandMmr.title'),
      description: t('commandMmr.description'),
      cmd: '!mmr',
      alias: ['rank', 'medal'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!mmr"
          response={t('commandMmr.response')}
        />
      ),
    },
    [Settings.commandGPM]: {
      key: Settings.commandGPM,
      title: t('commandGPM.title'),
      description: t('commandGPM.description'),
      cmd: '!gpm',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!gpm"
          response={t('commandGPM.response')}
        />
      ),
    },
    [Settings.commandAPM]: {
      key: Settings.commandAPM,
      title: t('commandAPM.title'),
      description: t('commandAPM.description'),
      cmd: '!apm',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat {...props} command="!apm" response={t('commandAPM.response')} />
      ),
    },
    [Settings.commandNP]: {
      key: Settings.commandNP,
      title: t('commandNP.title'),
      description: t('commandNP.description'),
      cmd: '!np',
      alias: ['who', 'players'],
      allowed: 'all',
      response: (props: Record<string, any> = {}, all = true) => (
        <div className="space-y-6">
          <TwitchChat
            {...props}
            command="!np"
            response={
              <>
                {t('commandNP.response1')}
                <Image
                  src="/images/flags/south-korea.png"
                  width={24}
                  height={24}
                  alt="south korea"
                  className="ml-1 mr-1 inline"
                />
                {t('commandNP.response2')}
                <Image
                  src="/images/flags/russia.png"
                  width={24}
                  height={24}
                  alt="russia"
                  className="ml-1 mr-1 inline"
                />
                {t('commandNP.response3')}
                <Image
                  src="/images/flags/estonia.png"
                  width={24}
                  height={24}
                  alt="estonia"
                  className="ml-1 mr-1 inline"
                />
                {t('commandNP.response4')}
                <Image
                  src="/images/flags/usa.png"
                  width={24}
                  height={24}
                  alt="usa"
                  className="ml-1 mr-1 inline"
                />
                {t('commandNP.response5')}
                <Image
                  src="/images/flags/lebanon.png"
                  width={24}
                  height={24}
                  alt="usa"
                  className="ml-1 mr-1 inline"
                />
                {t('commandNP.response6')}
              </>
            }
          />
          {all && (
            <>
              <TwitchChat
                {...props}
                command="!np add"
                response={t('commandNP.responseAdd')}
              />
              <TwitchChat
                {...props}
                command="!np remove"
                response={t('commandNP.responseRemove')}
              />
            </>
          )}
        </div>
      ),
    },
    [Settings.commandSmurfs]: {
      key: Settings.commandSmurfs,
      title: t('commandSmurfs.title'),
      description: t('commandSmurfs.description'),
      cmd: '!smurfs',
      alias: ['lifetimes', 'totals', 'games', 'smurf'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!smurfs"
          response={t('commandSmurfs.response')}
        />
      ),
    },
    [Settings.commandGM]: {
      key: Settings.commandGM,
      title: t('commandGM.title'),
      description: t('commandGM.description'),
      cmd: '!gm',
      alias: ['medals', 'ranks'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!gm"
          response={t('commandGM.response')}
        />
      ),
    },
    [Settings.commandLG]: {
      key: Settings.commandLG,
      title: t('commandLG.title'),
      description: t('commandLG.description'),
      cmd: '!lg',
      alias: ['lastgame'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!lg"
          response={t('commandLG.response')}
        />
      ),
    },
    ping: {
      title: t('ping.title'),
      description: t('ping.description'),
      cmd: '!ping',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat {...props} command="!ping" response={t('ping.response')} />
      ),
    },
    dotabod: {
      title: t('dotabod.title'),
      description: t('dotabod.description'),
      cmd: '!dotabod',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!dotabod"
          response={t('dotabod.response')}
        />
      ),
    },
    [Settings.commandLGS]: {
      key: Settings.commandLGS,
      title: t('commandLGS.title'),
      description: t('commandLGS.description'),
      cmd: '!lgs',
      alias: ['lastgamescore', 'lgscore', 'lgwl'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!lgs"
          response={t('commandLGS.response')}
        />
      ),
    },
    [Settings.commandProfile]: {
      key: Settings.commandProfile,
      title: t('commandProfile.title'),
      description: t('commandProfile.description'),
      cmd: '!profile',
      alias: ['stats', 'check'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <>
          <TwitchChat
            {...props}
            command="!profile blue"
            response={t('commandProfile.response1')}
          />
          <TwitchChat
            {...props}
            command="!profile ?"
            response={t('commandProfile.response2')}
          />
        </>
      ),
    },
    [Settings.commandHero]: {
      key: Settings.commandHero,
      title: t('commandHero.title'),
      description: t('commandHero.description'),
      cmd: '!hero',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <>
          <TwitchChat
            {...props}
            command="!hero"
            response={t('commandHero.response1')}
          />
          <TwitchChat
            {...props}
            command="!hero"
            response={t('commandHero.response2')}
          />
        </>
      ),
    },
    [Settings.commandBuilds]: {
      key: Settings.commandBuilds,
      title: t('commandBuilds.title'),
      description: t('commandBuilds.description'),
      cmd: '!builds',
      alias: ['dota2pt', 'build', 'd2pt', 'getbuild'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!builds"
          response={t('commandBuilds.response')}
        />
      ),
    },
    [Settings.commandDelay]: {
      key: Settings.commandDelay,
      title: t('commandDelay.title'),
      description: t('commandDelay.description'),
      cmd: '!delay',
      alias: ['streamdelay'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!delay"
          response={t('commandDelay.response')}
        />
      ),
    },
    [Settings.commandRosh]: {
      key: Settings.commandRosh,
      title: t('commandRosh.title'),
      description: t('commandRosh.description'),
      cmd: '!rosh',
      alias: ['aegis'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!rosh"
          response={chatterInfo.roshanKilled.message}
        />
      ),
    },
    [Settings.commandItems]: {
      key: Settings.commandItems,
      title: t('commandItems.title'),
      description: t('commandItems.description'),
      cmd: '!items',
      alias: ['item'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!items marci"
          response={t('commandItems.response')}
        />
      ),
    },
    [Settings.commandVersion]: {
      title: t('commandVersion.title'),
      description: t('commandVersion.description'),
      cmd: '!version',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!version"
          response={t('commandVersion.response')}
        />
      ),
    },
    [Settings.commandResetwl]: {
      title: t('commandResetwl.title'),
      description: t('commandResetwl.description'),
      cmd: '!resetwl',
      allowed: 'mods',
      alias: [],
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!resetwl"
          response={t('commandResetwl.response')}
        />
      ),
    },
    [Settings.commandLocale]: {
      title: t('commandLocale.title'),
      description: t('commandLocale.description'),
      cmd: '!locale',
      alias: ['translation', 'translatedby'],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!locale"
          response={t('commandLocale.response')}
        />
      ),
    },
    [Settings.commandFacet]: {
      key: Settings.commandFacet,
      title: t('commandFacet.title'),
      description: t('commandFacet.description'),
      cmd: '!facet jug 2',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!facet"
          response={t('commandFacet.response')}
        />
      ),
    },
    [Settings.commandWinProbability]: {
      key: Settings.commandWinProbability,
      title: t('commandWinProbability.title'),
      description: t('commandWinProbability.description'),
      cmd: '!wp',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!wp"
          response={t('commandWinProbability.response')}
        />
      ),
    },
    [Settings.commandSpectators]: {
      key: Settings.commandSpectators,
      title: t('commandSpectators.title'),
      description: t('commandSpectators.description'),
      cmd: '!spectators',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!spectators"
          response={t('commandSpectators.response')}
        />
      ),
    },
    [Settings.commandInnate]: {
      key: Settings.commandInnate,
      title: t('commandInnate.title'),
      description: t('commandInnate.description'),
      cmd: '!innate 4',
      alias: [],
      allowed: 'all',
      response: (props: Record<string, any> = {}) => (
        <TwitchChat
          {...props}
          command="!innate"
          response={t('commandInnate.response')}
        />
      ),
    },
  }
}

export default CommandDetail
