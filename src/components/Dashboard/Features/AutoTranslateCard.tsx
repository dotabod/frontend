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
  const { data: isChatTranslateEnabled } = useUpdateSetting(Settings.autoTranslate)
  const { data: targetLanguage, updateSetting: updateLanguage } = useUpdateSetting<string>(
    Settings.translationLanguage,
  )

  const { data: isOverlayTranslateEnabled } = useUpdateSetting(Settings.translateOnOverlay)

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
        Translate in-game chat messages to help international viewers understand conversations.
      </div>

      <div className='mb-4'>
        <p className='text-sm text-gray-300 mb-4'>
          Choose how you want translations to appear: in your chat, on your stream overlay, or both.
          When enabled, Dotabod will translate incoming in-game chat messages from other languages
          to your selected target language, helping international viewers understand conversations.
        </p>
      </div>

      <div className='flex items-center space-x-2 mb-4'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.autoTranslate}
          label='Translate messages in chat'
        />
        <Tag color={isChatTranslateEnabled ? 'green' : 'red'}>
          {isChatTranslateEnabled ? 'Chat: On' : 'Chat: Off'}
        </Tag>
      </div>

      <div className='flex items-center space-x-2 mb-4'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.translateOnOverlay}
          label='Show translations on overlay'
        />
        <Tag color={isOverlayTranslateEnabled ? 'blue' : 'gray'}>
          {isOverlayTranslateEnabled ? 'Overlay: On' : 'Overlay: Off'}
        </Tag>
      </div>

      {(isChatTranslateEnabled || isOverlayTranslateEnabled) && (
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

      {(isChatTranslateEnabled || isOverlayTranslateEnabled) && (
        <Alert
          message='Translation Active'
          description={
            <div>
              <p className='mb-2'>
                Chat messages from your games will be translated to{' '}
                <strong>
                  {LANGUAGE_OPTIONS.find((lang) => lang.value === targetLanguage)?.label ||
                    'English'}
                </strong>
                {isChatTranslateEnabled && isOverlayTranslateEnabled
                  ? ' and displayed in chat and on your overlay.'
                  : isChatTranslateEnabled
                    ? ' and displayed in chat.'
                    : ' and displayed on your overlay.'}
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
          <strong>How it works:</strong> Dotabod uses DeepL to convert incoming in-game chat
          messages in real-time. Independently toggle where you want translations to appear - in
          chat, on your stream overlay, or both.
        </p>
      </div>
    </Card>
  )
}
