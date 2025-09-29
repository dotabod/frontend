import { InfoCircleOutlined } from '@ant-design/icons'
import { Alert, Tag } from 'antd'
import { Card } from '@/ui/card'

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
  return (
    <Card
      title={
        <div className='flex items-center space-x-2 mb-4'>
          <span>Automatic Translation</span> <Tag color='orange'>Temporarily Disabled</Tag>
        </div>
      }
      feature='autoTranslate'
    >
      <Alert
        message='Coming Back Soon!'
        description={
          <div>
            <p className='mb-2'>
              We're currently experiencing high demand on our translation service and have hit
              Google's rate limits. This feature will be back online soon - we're working to resolve
              this as quickly as possible.
            </p>
            <p className='text-sm text-gray-400'>
              Automatic translation helps international viewers understand in-game chat messages on
              your stream overlay.
            </p>
          </div>
        }
        type='warning'
        showIcon
        icon={<InfoCircleOutlined />}
        className='mb-4'
      />

      <div className='mt-4 p-3 bg-gray-800 rounded-md'>
        <p className='text-xs text-gray-400'>
          <strong>What this feature does:</strong> When enabled, Dotabod translates incoming in-game
          chat messages to your chosen language and displays them on your stream overlay, making
          international streams more accessible to viewers.
        </p>
      </div>
    </Card>
  )
}
