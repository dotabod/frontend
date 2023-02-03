import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch, Tooltip } from '@mantine/core'
import { useForm } from '@mantine/form'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect } from 'react'
import { defaultSettings, Settings } from '@/lib/defaultSettings'

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
        <div className="flex items-center space-x-2">
          <Image
            width={22}
            height={22}
            alt="massivePIDAS"
            className="inline align-middle"
            src="/images/emotes/massivePIDAS.webp"
          />
          <span>Use your midas</span>
        </div>
        <div className="flex items-center space-x-2">
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
      <span className="flex items-center space-x-2">
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
      <span className="flex items-center space-x-2">
        <Image
          width={22}
          height={22}
          alt="Shush"
          className="inline align-middle"
          src="/images/emotes/Shush.png"
        />
        <span>Clockwerk is smoked!</span>
      </span>
    ),
  },
  passiveDeath: {
    tooltip: 'Whenever you die with passive stick / faerie / etc',
    category: CATEGORIES.Item,
    message: (
      <span className="flex items-center space-x-2">
        <span>Clockwerk died with passive faerie fire</span>
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
    message: (
      <>
        <span>Clockwerk picked up the aegis!</span>
        <div className="flex items-center space-x-2">
          <span>Clockwerk snatched the aegis</span>
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
  roshDeny: {
    tooltip: '',
    category: CATEGORIES.Event,
    message: (
      <span className="flex items-center space-x-2">
        <span>Clockwerk denied the aegis</span>
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
        <div className="flex items-center space-x-2">
          <span>The tip from Spectre</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/61e4254a06fd6a9f5be0ea96/1x"
          />
        </div>
        <div className="flex items-center space-x-2">
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
      <div className="flex items-center space-x-2">
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
        <div className="flex items-center space-x-2">
          <span>Clockwerk has a 4 kill streak</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/62aafeef6ef7a5f0b7df3d98/1x"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span>Clockwerk lost the 4 kill streak</span>
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
      <div className="flex items-center space-x-2">
        <span>Clockwerk giving up first blood</span>
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
        <div className="flex items-center space-x-2">
          <span>@techleed where&apos;s your tp</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/628f6c913c6f14b68848c078/1x.webp"
          />
        </div>
        <div className="flex items-center space-x-2">
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

  const chatters = dbChatters as typeof defaultSettings.chatters | undefined
  const form = useForm({ initialValues: chatters })

  useEffect(() => {
    if (chatters && !loadingChatters) {
      form.setValues(chatters)
      form.resetDirty(chatters)
    }
  }, [loadingChatters])

  const handleSubmit = (v: typeof defaultSettings.chatters) => {
    Object.keys(v).forEach((i) => {
      delete v[i].tooltip
      delete v[i].message
    })
    updateChatters(v)
    form.resetDirty()
  }

  return (
    <Card>
      <div className="title">
        <h3>Chatter</h3>
        {loading && (
          <Switch
            disabled
            size="lg"
            offLabel="All"
            onLabel="All"
            color="blue"
          />
        )}
        {!loading && (
          <Switch
            size="lg"
            offLabel="All"
            onLabel="All"
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            color="blue"
            defaultChecked={isEnabled}
          />
        )}
      </div>
      <div className="subtitle mb-2">
        The bot can post some random messages as you play your game.
      </div>

      <form className="mt-6 space-y-2">
        <div className="space-y-6">
          {(Object.keys(groupedChatterInfo || {}) || []).map((categoryName) => {
            return (groupedChatterInfo[categoryName] || []).map(
              (value, index) => {
                if (!value) return null
                return (
                  <div
                    key={value.id}
                    className={clsx(!isEnabled && 'opacity-40 transition-all')}
                  >
                    {!index && value?.category ? (
                      <div className="mb-2 text-sm text-dark-200">
                        {value.category}
                      </div>
                    ) : null}
                    <Tooltip label={value?.tooltip} disabled={!value?.tooltip}>
                      <div className="ml-4 flex items-center space-x-3">
                        <Switch
                          styles={{
                            labelWrapper: {
                              color: 'var(--mantine-color-dark-3)',
                            },
                          }}
                          label={value.message}
                          size="sm"
                          color="blue"
                          disabled={!isEnabled || loadingChatters}
                          {...form.getInputProps(`${value.id}.enabled`, {
                            type: 'checkbox',
                          })}
                          onChange={(e) => {
                            const originalChange = form.getInputProps(
                              `${value.id}.enabled`,
                              {
                                type: 'checkbox',
                              }
                            ).onChange

                            if (originalChange) originalChange(e)

                            handleSubmit({
                              ...form.values,
                              [value.id]: {
                                enabled: !!e?.currentTarget?.checked,
                              },
                            })
                          }}
                        />
                      </div>
                    </Tooltip>
                  </div>
                )
              }
            )
          })}
        </div>
      </form>
    </Card>
  )
}
