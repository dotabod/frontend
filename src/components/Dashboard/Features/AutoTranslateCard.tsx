import { InfoCircleOutlined } from '@ant-design/icons'
import { Alert, Select, Tag } from 'antd'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { localePatchSchema } from '@/lib/validations/setting'
import { Card } from '@/ui/card'
import { TierSwitch } from './TierSwitch'

// Convert locale schema to options for the Select component
const LANGUAGE_OPTIONS = localePatchSchema.options.map((locale) => ({
  value: locale,
  label: new Intl.DisplayNames(['en'], { type: 'language' }).of(locale.split('-')[0]) || locale,
}))

/**
 * AutoTranslateCard component controls automatic translation of chat messages.
 *
 * Backend Integration:
 * The backend should check the `autoTranslate` setting and use the `translationLanguage`
 * to translate incoming chat messages to the specified language:
 *
 * ```typescript
 * // Check if auto translation is enabled
 * const autoTranslateEnabled = dotaClient.client.settings?.autoTranslate || false;
 * const targetLanguage = dotaClient.client.settings?.translationLanguage || 'en';
 *
 * if (autoTranslateEnabled && message) {
 *   // Translate message to target language using Google Translate API
 *   const translatedMessage = await translateMessage(message, targetLanguage);
 *   // Send translated message via socket
 *   socket.emit('chatMessage', { message: translatedMessage });
 * }
 * ```
 */
export default function AutoTranslateCard(): React.ReactNode {
  const { data: isEnabled } = useUpdateSetting(Settings.autoTranslate)
  const { data: targetLanguage, updateSetting: updateLanguage } = useUpdateSetting<string>(
    Settings.translationLanguage,
  )

  const handleLanguageChange = (value: string) => {
    updateLanguage(value)
  }

  return (
    <Card
      title={
        <div className='flex items-center space-x-2 mb-4'>
          <span>Automatic Translation</span> <Tag color='green'>New</Tag>
        </div>
      }
      feature='autoTranslate'
    >
      <div className='subtitle'>
        Automatically translate in-game chat messages to a language of your choice (default English)
        for better understanding during streams.
      </div>

      <div className='mb-4'>
        <p className='text-sm text-gray-300 mb-4'>
          When enabled, Dotabod will translate incoming in-game chat messages from other languages
          to your selected target language and display them on the overlay. This helps viewers
          understand conversations in international streams.
        </p>
      </div>

      <div className='flex items-center space-x-2 mb-4'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.autoTranslate}
          label='Enable automatic translation'
        />
        <Tag color={isEnabled ? 'green' : 'red'}>
          {isEnabled ? 'Translation Enabled' : 'Translation Disabled'}
        </Tag>
      </div>

      {isEnabled && (
        <div className='mb-4'>
          <label
            htmlFor='translation-language-select'
            className='block text-sm font-medium text-gray-300 mb-2'
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
          <p className='text-xs text-gray-400 mt-1'>
            Chat messages from your games will be translated to this language on the overlay.
          </p>
        </div>
      )}

      {isEnabled && (
        <Alert
          message='Translation Active'
          description={
            <div>
              <p className='mb-2'>
                Chat messages from your games will be translated and displayed on your overlay in{' '}
                <strong>
                  {LANGUAGE_OPTIONS.find((lang) => lang.value === targetLanguage)?.label ||
                    'English'}
                </strong>
                .
              </p>
            </div>
          }
          type='info'
          showIcon
          icon={<InfoCircleOutlined />}
          className='mt-4'
        />
      )}

      <div className='mt-4 p-3 bg-gray-800 rounded-md'>
        <p className='text-xs text-gray-400'>
          <strong>How it works:</strong> Dotabod uses Google Translate to convert incoming in-game
          chat messages in real-time. Translated messages appear on your stream overlay, helping
          international viewers understand conversations.
        </p>
      </div>
    </Card>
  )
}
