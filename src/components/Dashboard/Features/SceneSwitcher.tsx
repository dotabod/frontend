import { DBSettings, defaultSettings } from '@/lib/DBSettings'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { Card } from '@/ui/card'
import { Display, Loading } from '@geist-ui/core'
import { Switch } from '@mantine/core'
import Image from 'next/image'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '../../Input'

export default function SceneSwitcher(): JSX.Element {
  const {
    data: isEnabled,
    loading: l0,
    updateSetting,
  } = useUpdateSetting(DBSettings['obs-scene-switcher'])
  const {
    data: obsDc,
    loading: l1,
    updateSetting: updateDc,
  } = useUpdateSetting(DBSettings['obs-dc'])
  const {
    data: obsMini,
    loading: l2,
    updateSetting: updateMini,
  } = useUpdateSetting(DBSettings['obs-minimap'])
  const {
    data: obsPick,
    loading: l3,
    updateSetting: updatePicks,
  } = useUpdateSetting(DBSettings['obs-picks'])

  const loading = l0 || l1 || l2 || l3

  const handleSceneName = useDebouncedCallback((value, updater) => {
    updater(value)
  }, 500)

  const scenes = {
    [DBSettings['obs-minimap']]: {
      value: obsMini,
      update: updateMini,
      label: 'Minimap blocker',
      helpText: 'Whenever the minimap is first shown, switch to this scene',
    },
    [DBSettings['obs-picks']]: {
      value: obsPick,
      update: updatePicks,
      label: 'Picks blocker',
      helpText:
        'As soon as picks are shown and heroes are able to be selected, switch to this scene',
    },
    [DBSettings['obs-dc']]: {
      value: obsDc,
      update: updateDc,
      label: 'Game disconnected',
      helpText:
        'Switch to this scene when you disconnect and leave a Dota game',
    },
  }

  return (
    <Card>
      <div className="title">
        <h3>OBS scene switcher</h3>
        {l0 && <Switch disabled size="lg" color="blue" />}
        {!l0 && (
          <Switch
            size="lg"
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            color="blue"
            defaultChecked={isEnabled}
          />
        )}
      </div>
      <div className="subtitle">
        Will auto switch scenes in OBS depending on game state.
      </div>

      <div className="mb-4">
        This is optional but useful if you want to make your stream look unique
        for different game states!
      </div>
      {isEnabled && (
        <ul className="ml-4 mb-2 list-decimal space-y-2 text-sm">
          <li>
            Must put the dotabod browser source in the scenes you want to block
            hero picks or minimap in.
          </li>
          <li>
            Must set browser properties to{' '}
            <span className="italics">Advanced access to OBS</span>
          </li>
          <li>Must create the following scenes (case sensitive)</li>
          <ul className="ml-4 list-none space-y-6">
            {Object.keys(scenes).map((sceneKey: string) => {
              const scene = scenes[sceneKey]
              return (
                <li key={sceneKey} className="space-y-1">
                  <label htmlFor={sceneKey} className="block text-sm">
                    {scene.label}
                  </label>
                  {loading && (
                    <div className="w-52 rounded-md border border-gray-200 pt-2">
                      <Loading className="left-0" />
                    </div>
                  )}
                  {!loading && (
                    <Input
                      id={sceneKey}
                      placeholder={
                        defaultSettings['obs-scene-switcher'][sceneKey]
                      }
                      defaultValue={scene.value}
                      name={sceneKey}
                      onChange={(e) =>
                        handleSceneName(e.target.value, scene.update)
                      }
                    />
                  )}

                  <span className="block text-xs italic">{scene.helpText}</span>
                </li>
              )
            })}
          </ul>
        </ul>
      )}

      <Display shadow caption="Example OBS scenes and sources">
        <Image
          width={536}
          height={115}
          alt="scene switcher"
          src="/images/scene-switcher.png"
        />
      </Display>
    </Card>
  )
}
