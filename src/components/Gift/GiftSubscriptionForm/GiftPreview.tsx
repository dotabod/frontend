import GiftSubscriptionAlert from '@/components/Overlay/GiftAlert/GiftSubscriptionAlert'
import TwitchChat from '@/components/TwitchChat'
import { Card, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

interface GiftPreviewProps {
  senderName: string
  giftMessage: string
  quantity: number
}

export const GiftPreview = ({ senderName, giftMessage, quantity }: GiftPreviewProps) => {
  const giftChatMessage = (
    <>
      {senderName === 'Anonymous' ? (
        <span className='space-x-1'>
          <span>A gift sub for Dotabod Pro was just gifted anonymously!</span>
          {giftMessage && <span>{giftMessage}</span>}
        </span>
      ) : (
        <span className='space-x-1'>
          <span>
            A gift sub for Dotabod Pro was just gifted by{' '}
            <span className='text-purple-400 font-semibold'>{senderName}</span>!
          </span>
          {giftMessage && <span>{giftMessage}</span>}
        </span>
      )}
    </>
  )

  return (
    <Card className='w-full md:w-auto'>
      <Title level={4}>Gift Subscription Preview</Title>
      <Paragraph>
        Here's how your gift will appear in the streamer's Twitch chat and overlay when they receive it:
      </Paragraph>

      <div className='space-y-6'>
        <div>
          <Text strong className='mb-2 block'>Twitch Chat</Text>
          <TwitchChat responses={[giftChatMessage]} />
        </div>

        <div>
          <Text strong className='mb-2 block'>Stream Overlay</Text>
          <div className='rounded-md bg-gray-800 p-2 sm:p-4'>
            <div className='relative h-40 sm:h-52 w-full overflow-hidden flex items-center justify-center'>
              <GiftSubscriptionAlert
                senderName={senderName}
                giftType='monthly'
                giftQuantity={quantity}
                giftMessage={giftMessage}
                preview={true}
                className=''
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
