import { Tooltip } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import type { ChatterSettingKeys } from '@/utils/subscription'
import DotabodChatter from './DotabodChatter'
import { TierSwitch } from './TierSwitch'

enum CATEGORIES {
  General = 'General',
  Hero = 'Heroes',
  Item = 'Item Usage',
  Event = 'Events',
}
export const chatterInfo = {
  bounties: {
    category: CATEGORIES.Event,
    message: (
      <div className='space-x-2'>
        <span>+80 gold from bounty (2/4)</span>
        <Image
          width={22}
          height={22}
          alt='EZ'
          className='inline align-middle'
          src='https://cdn.7tv.app/emote/01F9FS6EEG0006XXD6DX0K9Y04/2x.webp'
        />
        <Image
          width={22}
          height={22}
          alt='Clap'
          className='inline align-middle'
          src='https://cdn.7tv.app/emote/01F6NE9AER000CKKT9BSDYGT0J/2x.webp'
        />
        <span>Thanks Pink, Yellow</span>
        <Image
          width={22}
          height={22}
          alt='SeemsGood'
          className='inline align-middle'
          src='https://cdn.7tv.app/emote/01GTD2AQWG0004J62EZBADK0F5/2x.webp'
        />
      </div>
    ),
    tooltip: '',
  },
  commandsReady: {
    category: CATEGORIES.Event,
    message: (
      <span>Match data found !np · !smurfs · !gm · !lg · !avg · !items commands activated.</span>
    ),
    tooltip:
      'At the beginning of every match, once !np etc are ready. Usually when you first spawn in fountain.',
  },
  dotapatch: {
    category: CATEGORIES.Event,
    message: (
      <span className='inline space-x-2'>
        <Image
          width={22}
          height={22}
          alt='PogChamp'
          className='inline align-middle'
          src='https://static-cdn.jtvnw.net/emoticons/v2/305954156/default/dark/2.0'
        />
        <span>
          A new Dota 2 patch has been released: 7.41. Check out the patch notes at
          https://www.dota2.com/patches
        </span>
      </span>
    ),
    tooltip: 'When a new Dota 2 patch is available',
  },
  firstBloodDeath: {
    category: CATEGORIES.Hero,
    message: (
      <div className='space-x-2'>
        <span>Pudge giving up first blood</span>
        <Image
          width={22}
          height={22}
          alt='PepeLaugh'
          className='inline align-middle'
          src='https://cdn.7tv.app/emote/01F6Q76NN80005589X3BDK9CN1/2x.webp'
        />
      </div>
    ),
    tooltip: '',
  },
  killstreak: {
    category: CATEGORIES.Hero,
    message: (
      <>
        <div className='space-x-2'>
          <span>Pudge has a 4 kill streak</span>
          <Image
            width={22}
            height={22}
            alt='POGGIES'
            className='inline align-middle'
            src='https://cdn.7tv.app/emote/01F6P05NWG0003BH8AEY96655D/2x.webp'
          />
        </div>
        <div className='space-x-2'>
          <span>Pudge lost the 4 kill streak</span>
          <Image
            width={22}
            height={22}
            alt='BibleThump'
            className='inline align-middle'
            src='https://cdn.7tv.app/emote/01J8NMZ2HG0005G1FWF2H9Y615/2x.webp'
          />
        </div>
      </>
    ),
    tooltip: '',
  },
  matchOutcome: {
    category: CATEGORIES.Event,
    message: (
      <>
        <div className='space-x-2'>
          <span>We have lost, gg nt</span>
          <Image
            width={22}
            height={22}
            unoptimized
            alt='happi'
            className='inline align-middle'
            src='https://cdn.betterttv.net/emote/634042bce6cf26500b42ce56/1x.webp'
          />
          <span>go next</span>
        </div>
        <div className='space-x-2'>
          <span>We have won</span>
          <Image
            width={22}
            height={22}
            unoptimized
            alt='happi'
            className='inline align-middle'
            src='https://cdn.betterttv.net/emote/634042bce6cf26500b42ce56/1x.webp'
          />
          <span>go next</span>
        </div>
      </>
    ),
    tooltip: 'At the end of every match',
  },
  midas: {
    category: CATEGORIES.Item,
    message: (
      <>
        <div className='space-x-2'>
          <Image
            width={22}
            height={22}
            alt='massivePIDAS'
            className='inline align-middle'
            src='/images/emotes/massivePIDAS.webp'
          />
          <span>Use your midas</span>
        </div>
        <div className='space-x-2'>
          <span>Midas was finally used, 64 seconds late</span>
          <Image
            width={22}
            height={22}
            alt='Madge'
            className='inline align-middle'
            src='https://cdn.7tv.app/emote/01F6ASPNM00009TPCEMWQTT4XX/2x.webp'
          />
        </div>
      </>
    ),
    tooltip: 'If your midas is ready and unused for 10s',
  },
  neutralItems: {
    category: CATEGORIES.Event,
    message: (
      <span className='inline space-x-2'>
        <span>Tier 1 neutral items are now available! Time to check the jungle</span>
        <Image
          width={22}
          height={22}
          alt='PogChamp'
          className='inline align-middle'
          src='https://static-cdn.jtvnw.net/emoticons/v2/305954156/default/dark/2.0'
        />
      </span>
    ),
    tooltip:
      "Depending on whether you're playing turbo or normal, neutral items will be available at different times.",
  },
  noTp: {
    category: CATEGORIES.Item,
    message: (
      <>
        <div className='space-x-2'>
          <span>@techleed where&apos;s your tp</span>
          <Image
            width={22}
            height={22}
            alt='HECANT'
            className='inline align-middle'
            src='https://cdn.7tv.app/emote/01G4FZG870000487MWX9F93YF7/2x.webp'
          />
        </div>
        <div className='space-x-2'>
          <span>@techleed nice job getting a tp finally after 322 seconds</span>
          <Image
            width={22}
            height={22}
            alt='Okayeg'
            className='inline align-middle'
            src='https://cdn.7tv.app/emote/01EZPFKAH8000FNWX000ADZW5H/2x.webp'
          />
          <span>👍</span>
        </div>
      </>
    ),
    tooltip: 'If you dont have a tp within 30 seconds, you get a message',
  },
  passiveDeath: {
    category: CATEGORIES.Item,
    message: (
      <span className='inline space-x-2'>
        <span>Pudge died with passive faerie fire</span>
        <Image
          width={22}
          height={22}
          alt='ICANT'
          className='inline align-middle'
          src='https://cdn.betterttv.net/emote/61e4254a06fd6a9f5be0ea96/1x'
        />
      </span>
    ),
    tooltip: 'Whenever you die with passive stick / faerie / etc',
  },
  pause: {
    category: CATEGORIES.Item,
    message: (
      <span className='inline space-x-2'>
        <Image
          width={22}
          height={22}
          alt='pauseChamp'
          className='inline align-middle'
          src='/images/emotes/pauseChamp.webp'
        />
        <span>Who paused the game?</span>
      </span>
    ),
    tooltip: 'As soon as anyone presses F9',
  },
  powerTreads: {
    category: CATEGORIES.Item,
    message: 'We toggled treads 6 time to save a total 284 mana this match.',
    tooltip: '',
  },
  roshDeny: {
    category: CATEGORIES.Event,
    message: (
      <span className='inline space-x-2'>
        <span>Pudge denied the aegis</span>
        <Image
          width={22}
          height={22}
          alt='ICANT'
          className='inline align-middle'
          src='https://cdn.betterttv.net/emote/61e4254a06fd6a9f5be0ea96/1x'
        />
      </span>
    ),
    tooltip: '',
  },
  roshPickup: {
    category: CATEGORIES.Event,
    message: 'Pudge picked up the aegis!',
    tooltip: '',
  },
  roshanKilled: {
    category: CATEGORIES.Event,
    message:
      "Roshan killed! Next roshan between 30:27 and 33:27 · Rosh deaths: 1 · Next drop: agh's shard. · Invoker picked up the aegis!",
    tooltip: '',
  },
  smoke: {
    category: CATEGORIES.Hero,
    message: (
      <span className='inline space-x-2'>
        <Image
          width={22}
          height={22}
          alt='Shush'
          className='inline align-middle'
          src='/images/emotes/Shush.png'
        />
        <span>Pudge is smoked!</span>
      </span>
    ),
    tooltip: 'Whenever your hero has smoke debuff',
  },
  smokeActivated: {
    category: CATEGORIES.Event,
    message: (
      <span className='inline space-x-2'>
        <span>team smoking without you</span>
        <Image
          width={22}
          height={22}
          alt='HAH'
          className='inline align-middle'
          src='https://cdn.7tv.app/emote/01H1F4W6P80005BD0YVPMCDXGT/2x.webp'
        />
      </span>
    ),
    tooltip: 'When a teammate pops smoke but you got left behind',
  },
  tip: {
    category: CATEGORIES.Event,
    message: (
      <>
        <div className='space-x-2'>
          <span>The tip from Spectre</span>
          <Image
            width={22}
            height={22}
            alt='ICANT'
            className='inline align-middle'
            src='https://cdn.betterttv.net/emote/61e4254a06fd6a9f5be0ea96/1x'
          />
        </div>
        <div className='space-x-2'>
          <span>We tipping Crystal Maiden</span>
          <Image
            width={22}
            height={22}
            alt='PepeLaugh'
            className='inline align-middle'
            src='https://cdn.7tv.app/emote/01F6Q76NN80005589X3BDK9CN1/2x.webp'
          />
        </div>
      </>
    ),
    tooltip: '',
  },
}

const groupedChatterInfo = Object.entries(chatterInfo).reduce(
  (acc, [key, value]) => {
    const { category } = value
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push({ ...value, id: key })
    return acc
  },
  {} as Record<
    string,
    { id: string; tooltip: string; category: CATEGORIES; message: React.ReactNode }[]
  >,
)

type GroupedChatterItem = (typeof groupedChatterInfo)[string][number]

export default function ChatterCard() {
  const { data: isEnabled } = useUpdateSetting(Settings.chatter)
  const { data: dbChatters, updateSetting: updateChatters } = useUpdateSetting<
    Record<string, { enabled: boolean }>
  >(Settings.chatters)

  return (
    <>
      <Card>
        <div className='title'>
          <h3>Everything</h3>
        </div>

        <div className='flex items-center space-x-4'>
          <TierSwitch settingKey={Settings.chatter} label='Turn off every chatter' />
        </div>
      </Card>

      <div
        className={clsx(
          !isEnabled && 'opacity-40 transition-all',
          'grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2',
        )}
      >
        <DotabodChatter />
        {(Object.keys(groupedChatterInfo || {}) || []).map((categoryName) => (
          <Card key={categoryName} title={categoryName}>
            <div className='ml-4 flex flex-col space-y-3'>
              {(groupedChatterInfo[categoryName] || []).map((value: GroupedChatterItem) => (
                <div key={value.id}>
                  <Tooltip title={value?.tooltip} placement='left'>
                    <div className='flex items-center space-x-3'>
                      <TierSwitch
                        settingKey={`chatters.${value.id}` as ChatterSettingKeys}
                        disabled={!isEnabled}
                        checked={dbChatters[value.id]?.enabled}
                        onChange={(checked) => {
                          updateChatters({
                            ...dbChatters,
                            [value.id]: {
                              enabled: checked,
                            },
                          })
                        }}
                      />
                      <span>{value.message}</span>
                    </div>
                  </Tooltip>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
