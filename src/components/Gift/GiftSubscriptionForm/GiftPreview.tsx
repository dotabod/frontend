import TwitchChat from '@/components/TwitchChat'
import { Card } from '@/ui/card'

interface GiftPreviewProps {
  senderName: string
  giftMessage: string
}

export const GiftPreview = ({ senderName, giftMessage }: GiftPreviewProps) => {
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
            <span className='font-semibold text-purple-400'>{senderName}</span>!
          </span>
          {giftMessage && <span>{giftMessage}</span>}
        </span>
      )}
    </>
  )

  return (
    <Card className='h-full'>
      <h2 className='text-lg font-medium text-gray-100'>How it lands in their chat</h2>
      <p className='mt-1 text-sm text-gray-400'>
        This updates live as you fill out the form. Here's the message your gift posts in the
        streamer's Twitch chat.
      </p>

      <div className='mt-5'>
        <span className='mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-gray-500'>
          Twitch chat
        </span>
        <TwitchChat responses={[giftChatMessage]} />
      </div>
    </Card>
  )
}
