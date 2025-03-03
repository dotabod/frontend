import { type SettingKeys, Settings, defaultSettings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Input, Tag } from 'antd'
import Image from 'next/image'
import { useDebouncedCallback } from 'use-debounce'
import { TierInput } from './TierInput'
import { TierSwitch } from './TierSwitch'

export default function SceneSwitcher(): React.ReactNode {
  const { data: isEnabled, loading: l0 } = useUpdateSetting(Settings['obs-scene-switcher'])
  const {
    data: obsDc,
    loading: l1,
    updateSetting: updateDc,
  } = useUpdateSetting<string>(Settings['obs-dc'])
  const {
    data: obsMini,
    loading: l2,
    updateSetting: updateMini,
  } = useUpdateSetting<string>(Settings['obs-minimap'])
  const {
    data: obsPick,
    loading: l3,
    updateSetting: updatePicks,
  } = useUpdateSetting<string>(Settings['obs-picks'])

  const loading = l0 || l1 || l2 || l3

  const handleSceneName = useDebouncedCallback((value, updater) => {
    updater(value)
  }, 500)

  const scenes = {
    [Settings['obs-minimap']]: {
      value: obsMini,
      update: updateMini,
      label: 'Minimap blocker',
      helpText: 'Whenever the minimap is first shown, switch to this scene',
    },
    [Settings['obs-picks']]: {
      value: obsPick,
      update: updatePicks,
      label: 'Picks blocker',
      helpText:
        'As soon as picks are shown and heroes are able to be selected, switch to this scene',
    },
    [Settings['obs-dc']]: {
      value: obsDc,
      update: updateDc,
      label: 'Game disconnected',
      helpText: 'Switch to this scene when you disconnect and leave a Dota game',
    },
  }

  return (
    <Card title='OBS scene switcher' feature='obs-scene-switcher'>
      <div className='subtitle'>
        Auto switch scenes in OBS depending on game state. Your blockers will still work without
        this.
        <p className='mt-2 text-xs'>
          <Tag color='purple'>Note</Tag>Does not work with Streamlabs
        </p>
      </div>

      <div className='mb-4'>
        <TierSwitch
          label='Enable OBS scene switcher'
          hideTierBadge
          settingKey={Settings['obs-scene-switcher']}
        />
      </div>

      <div className='mb-4'>
        This is optional but useful if you want to make your stream look unique for different game
        states!
      </div>

      {isEnabled && (
        <ul className='mb-2 ml-4 list-decimal space-y-2 text-sm'>
          <li>
            Must put the dotabod browser source in the scenes you want to block hero picks or
            minimap in.
          </li>
          <li>
            Must set browser properties to <span className='italics'>Advanced access to OBS</span>
          </li>
          <li>Must create the following scenes (case sensitive)</li>
          <ul className='ml-4 list-none space-y-6'>
            {Object.keys(scenes).map((sceneKey: string) => {
              const scene = scenes[sceneKey]
              return (
                <li key={sceneKey}>
                  {loading && <Input placeholder='Loading...' disabled />}
                  {!loading && (
                    <TierInput
                      hideTierBadge
                      settingKey={sceneKey as SettingKeys}
                      label={scene.label}
                      placeholder={defaultSettings['obs-scene-switcher'][sceneKey]}
                      value={scene.value}
                      maxLength={200}
                      onChange={(value) => handleSceneName(value, scene.update)}
                      helpText={scene.helpText}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </ul>
      )}

      <div className='flex flex-col items-center space-y-4'>
        <Image
          width={536}
          height={115}
          alt='scene switcher'
          src='/images/setup/scene-switcher.png'
        />
        <span>Example OBS scenes and sources</span>
      </div>
    </Card>
  )
}
