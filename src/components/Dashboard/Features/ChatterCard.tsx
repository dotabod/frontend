import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch, Tooltip } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import { Settings } from '@/lib/defaultSettings'
import DotabodChatter from './DotabodChatter'

enum CATEGORIES {
  General = 'General',
  Hero = 'Heroes',
  Item = 'Item Usage',
  Event = 'Events',
}
export const chatterInfo = {
  midas: {
    tooltip: 'If your midas is ready and unused for 10s',
    category: CATEGORIES.Item,
    message: (
      <>
        <div className="space-x-2">
          <Image
            width={22}
            height={22}
            alt="massivePIDAS"
            className="inline align-middle"
            src="/images/emotes/massivePIDAS.webp"
          />
          <span>Use your midas</span>
        </div>
        <div className="space-x-2">
          <span>Midas was finally used, 64 seconds late</span>
          <Image
            width={22}
            height={22}
            alt="massivePIDAS"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/6350aa989bb828a9f0d42863/1x"
          />
        </div>
      </>
    ),
  },
  pause: {
    tooltip: 'As soon as anyone presses F9',
    category: CATEGORIES.Item,
    message: (
      <span className="inline space-x-2">
        <Image
          width={22}
          height={22}
          alt="pauseChamp"
          className="inline align-middle"
          src="/images/emotes/pauseChamp.webp"
        />
        <span>Who paused the game?</span>
      </span>
    ),
  },
  smoke: {
    tooltip: 'Whenever your hero has smoke debuff',
    category: CATEGORIES.Hero,
    message: (
      <span className="inline space-x-2">
        <Image
          width={22}
          height={22}
          alt="Shush"
          className="inline align-middle"
          src="/images/emotes/Shush.png"
        />
        <span>Pudge is smoked!</span>
      </span>
    ),
  },
  passiveDeath: {
    tooltip: 'Whenever you die with passive stick / faerie / etc',
    category: CATEGORIES.Item,
    message: (
      <span className="inline space-x-2">
        <span>Pudge died with passive faerie fire</span>
        <Image
          width={22}
          height={22}
          alt="ICANT"
          className="inline align-middle"
          src="https://cdn.betterttv.net/emote/61e4254a06fd6a9f5be0ea96/1x"
        />
      </span>
    ),
  },
  roshPickup: {
    tooltip: '',
    category: CATEGORIES.Event,
    message: 'Pudge picked up the aegis!',
  },
  roshDeny: {
    tooltip: '',
    category: CATEGORIES.Event,
    message: (
      <span className="inline space-x-2">
        <span>Pudge denied the aegis</span>
        <Image
          width={22}
          height={22}
          alt="ICANT"
          className="inline align-middle"
          src="https://cdn.betterttv.net/emote/61e4254a06fd6a9f5be0ea96/1x"
        />
      </span>
    ),
  },
  roshanKilled: {
    tooltip: '',
    category: CATEGORIES.Event,
    message:
      "Roshan killed! Next roshan between 30:27 and 33:27 · Rosh deaths: 1 · Next drop: agh's shard. · Invoker picked up the aegis!",
  },
  tip: {
    tooltip: '',
    category: CATEGORIES.Event,
    message: (
      <>
        <div className="space-x-2">
          <span>The tip from Spectre</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/61e4254a06fd6a9f5be0ea96/1x"
          />
        </div>
        <div className="space-x-2">
          <span>We tipping Crystal Maiden</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/61e4254a06fd6a9f5be0ea96/1x"
          />
        </div>
      </>
    ),
  },
  bounties: {
    tooltip: '',
    category: CATEGORIES.Event,
    message: (
      <div className="space-x-2">
        <span>+80 gold from bounty (2/4)</span>
        <Image
          width={22}
          height={22}
          alt="ICANT"
          className="inline align-middle"
          src="https://cdn.betterttv.net/emote/600ae212df6a0665f274c9df/1x"
        />
        <Image
          width={22}
          height={22}
          alt="ICANT"
          className="inline align-middle"
          src="https://cdn.betterttv.net/emote/62b103336ef7a5f0b7df90c4/1x"
        />
        <span>Thanks Pink, Yellow</span>
        <Image
          width={22}
          height={22}
          alt="ICANT"
          className="inline align-middle"
          src="https://cdn.betterttv.net/emote/60936f4a39b5010444d0c752/1x"
        />
      </div>
    ),
  },
  powerTreads: {
    tooltip: '',
    category: CATEGORIES.Item,
    message: 'We toggled treads 6 time to save a total 284 mana this match.',
  },
  killstreak: {
    tooltip: '',
    category: CATEGORIES.Hero,
    message: (
      <>
        <div className="space-x-2">
          <span>Pudge has a 4 kill streak</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/62aafeef6ef7a5f0b7df3d98/1x"
          />
        </div>
        <div className="space-x-2">
          <span>Pudge lost the 4 kill streak</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/61a5e69b371b825d3f6dd0b2/1x"
          />
        </div>
      </>
    ),
  },
  firstBloodDeath: {
    tooltip: '',
    category: CATEGORIES.Hero,
    message: (
      <div className="space-x-2">
        <span>Pudge giving up first blood</span>
        <Image
          width={22}
          height={22}
          alt="ICANT"
          className="inline align-middle"
          src="https://cdn.betterttv.net/emote/61fe1b9406fd6a9f5be370fd/1x"
        />
      </div>
    ),
  },
  noTp: {
    tooltip: 'If you dont have a tp within 30 seconds, you get a message',
    category: CATEGORIES.Item,
    message: (
      <>
        <div className="space-x-2">
          <span>@techleed where&apos;s your tp</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/628f6c913c6f14b68848c078/1x.webp"
          />
        </div>
        <div className="space-x-2">
          <span>@techleed nice job getting a tp finally after 322 seconds</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/60ec91f58ed8b373e4221742/1x.webp"
          />
        </div>
      </>
    ),
  },
  matchOutcome: {
    tooltip: 'At the end of every match',
    category: CATEGORIES.Event,
    message: (
      <>
        <div className="space-x-2">
          <span>We have lost, gg nt</span>
          <Image
            width={22}
            height={22}
            alt="happi"
            className="inline align-middle"
            src="https://cdn.7tv.app/emote/63c4520819eab0d59a02e872/1x.webp"
          />
          <span>go next</span>
        </div>
        <div className="space-x-2">
          <span>We have won</span>
          <Image
            width={22}
            height={22}
            alt="happi"
            className="inline align-middle"
            src="https://cdn.7tv.app/emote/63c4520819eab0d59a02e872/1x.webp"
          />
          <span>go next</span>
        </div>
      </>
    ),
  },
  commandsReady: {
    tooltip:
      'At the beginning of every match, once !np etc are ready. Usually when you first spawn in fountain.',
    category: CATEGORIES.Event,
    message: (
      <span>
        Match data found !np · !smurfs · !gm · !lg · !avg · !items commands
        activated.
      </span>
    ),
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
  {}
)

export default function ChatterCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.chatter)
  const {
    data: dbChatters,
    loading: loadingChatters,
    updateSetting: updateChatters,
  } = useUpdateSetting(Settings.chatters)

  return (
    <>
      <Card>
        <div className="title">
          <h3>Everything</h3>
        </div>

        <div className="flex items-center space-x-4">
          <Switch
            loading={loading}
            checkedChildren="All"
            unCheckedChildren="All"
            onChange={updateSetting}
            checked={isEnabled}
          />
          <span>Turn off every chatter</span>
        </div>
      </Card>

      <div
        className={clsx(
          !isEnabled && 'opacity-40 transition-all',
          'grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2'
        )}
      >
        <DotabodChatter />
        {(Object.keys(groupedChatterInfo || {}) || []).map((categoryName) => {
          return (
            <Card key={categoryName}>
              <div className="title">
                <h3>{categoryName}</h3>
              </div>
              <div className="ml-4 flex flex-col space-y-3">
                {(groupedChatterInfo[categoryName] || []).map((value) => (
                  <div key={value.id}>
                    <Tooltip title={value?.tooltip} placement="left">
                      <div className="flex items-center space-x-3">
                        <Switch
                          disabled={!isEnabled || loadingChatters}
                          checked={dbChatters[value.id]?.enabled}
                          onChange={(checked, e) => {
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
          )
        })}
      </div>
    </>
  )
}
