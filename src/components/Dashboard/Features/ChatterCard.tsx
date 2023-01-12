import { DBSettings, defaultSettings } from '@/lib/DBSettings'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch, Tooltip } from '@mantine/core'
import { useForm } from '@mantine/form'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect } from 'react'

export const chatterInfo = {
  midas: {
    description: 'If your midas is ready and unused for 10s',
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
    description: 'As soon as anyone presses F9',
    message: (
      <span className="space-x-2">
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
    description: 'Whenever your hero has smoke debuff',
    message: (
      <span className="space-x-2">
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
    description: 'Whenever you die with passive stick / faerie / etc',
    message: (
      <span className="space-x-2">
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
    description: '',
    message: 'Clockwerk picked up the aegis!',
  },
  roshDeny: {
    description: '',
    message: (
      <span className="space-x-2">
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
    description: '',
    message: 'Roshan killed! Next roshan between 15:32 and 26:32',
  },
  tip: {
    description: '',
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
    description: '',
    message: (
      <div className="space-x-2">
        <span>+80 gold from bounty</span>
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
    description: '',
    message: 'We toggled treads 6 time to save a total 284 mana this match.',
  },
  killstreak: {
    description: '',
    message: (
      <>
        <div className="space-x-2">
          <span>Clockwerk has a 4 kill streak</span>
          <Image
            width={22}
            height={22}
            alt="ICANT"
            className="inline align-middle"
            src="https://cdn.betterttv.net/emote/62aafeef6ef7a5f0b7df3d98/1x"
          />
        </div>
        <div className="space-x-2">
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
    description: '',
    message: (
      <>
        <span>Clockwerk gave up first blood</span>
        <Image
          width={22}
          height={22}
          alt="ICANT"
          className="inline align-middle"
          src="https://cdn.betterttv.net/emote/61fe1b9406fd6a9f5be370fd/1x"
        />
      </>
    ),
  },
}

export default function ChatterCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(DBSettings.chatter)
  const {
    data: dbChatters,
    loading: loadingChatters,
    updateSetting: updateChatters,
  } = useUpdateSetting(DBSettings.chatters)

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
      delete v[i].description
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
          {(Object.keys(chatters || {}) || []).map((key) => {
            return (
              <div key={key} className={clsx(!isEnabled && 'opacity-40')}>
                <Tooltip
                  label={chatterInfo[key].description}
                  disabled={!chatterInfo[key].description}
                >
                  <div className="flex items-center space-x-3">
                    <Switch
                      size="sm"
                      color="blue"
                      disabled={!isEnabled}
                      {...form.getInputProps(`${key}.enabled`, {
                        type: 'checkbox',
                      })}
                      onChange={(e) => {
                        const originalChange = form.getInputProps(
                          `${key}.enabled`,
                          {
                            type: 'checkbox',
                          }
                        ).onChange

                        if (originalChange) originalChange(e)

                        handleSubmit({
                          ...form.values,
                          [key]: {
                            enabled: !!e?.currentTarget?.checked,
                          },
                        })
                      }}
                    />
                    <div>{chatterInfo[key].message}</div>
                  </div>
                </Tooltip>
              </div>
            )
          })}
        </div>
      </form>
    </Card>
  )
}
