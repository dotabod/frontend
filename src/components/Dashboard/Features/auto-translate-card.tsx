import { Select } from 'antd'

import { Settings } from '@/lib/default-settings'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { localePatchSchema } from '@/lib/validations/setting'
import { Card } from '@/ui/card'

import { TierSwitch } from './tier-switch'

// Convert locale schema to options for the Select component
const LANGUAGE_OPTIONS = localePatchSchema.options.map((locale) => ({
  label: new Intl.DisplayNames(['en'], { type: 'language' }).of(locale.split('-')[0]) ?? locale,
  value: locale,
}))

const AutoTranslateCard = (): React.ReactNode => {
  const { data: isChatTranslateEnabled } = useUpdateSetting(Settings.autoTranslate)
  const { data: targetLanguage, updateSetting: updateLanguage } = useUpdateSetting<string>(
    Settings.translationLanguage,
  )

  const { data: isOverlayTranslateEnabled } = useUpdateSetting(Settings.translateOnOverlay)

  const handleLanguageChange = (value: string) => {
    updateLanguage(value)
  }

  return (
    <Card title='Automatic translation' feature='autoTranslate'>
      <p className='mb-4 text-sm text-gray-300'>
        Translate incoming in-game chat in Twitch chat, on your overlay, or both.
      </p>

      <div className='mb-4'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.autoTranslate}
          label='Translate messages in chat'
        />
      </div>

      <div className='mb-4'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.translateOnOverlay}
          label='Show translations on overlay'
        />
      </div>

      {(isChatTranslateEnabled || isOverlayTranslateEnabled) && (
        <div className='mb-4'>
          <label
            htmlFor='translation-language-select'
            className='mb-2 block text-sm font-medium text-gray-300'
          >
            Target Language
          </label>
          <Select
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            optionFilterProp='children'
            id='translation-language-select'
            value={targetLanguage || 'en'}
            onChange={handleLanguageChange}
            options={LANGUAGE_OPTIONS}
            style={{ width: 200 }}
            placeholder='Select target language'
          />
        </div>
      )}
    </Card>
  )
}

export default AutoTranslateCard
