import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { GiftIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTransformRes } from '@/lib/hooks/useTransformRes'

interface GiftSubscriptionAlertProps {
  senderName: string
  giftType: string
  giftQuantity: number
  giftMessage?: string
  onComplete?: () => void
  className?: string
  preview?: boolean
}

const GiftSubscriptionAlert = ({
  senderName,
  giftType,
  giftQuantity,
  giftMessage,
  onComplete,
  className,
  preview = false,
}: GiftSubscriptionAlertProps) => {
  const [visible, setVisible] = useState(true)
  const res = useTransformRes()

  // Format the gift type for display
  const formatGiftType = () => {
    if (giftType === 'lifetime') return 'Lifetime'

    const duration =
      giftQuantity > 1
        ? `${giftQuantity} ${giftType === 'annual' ? 'Years' : 'Months'}`
        : giftType === 'annual'
          ? '1 Year'
          : '1 Month'

    return duration
  }

  // Hide the alert after 10 seconds
  useEffect(() => {
    // Skip the timeout in preview mode
    if (preview) return

    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        onComplete?.()
      }, 500) // Allow time for exit animation
    }, 10000)

    return () => clearTimeout(timer)
  }, [onComplete, preview])

  // Set appropriate animation properties based on preview mode
  const initialAnimation = preview ? {} : { opacity: 0, y: -50 }
  const animateAnimation = preview ? { opacity: 1 } : { opacity: 1, y: 0 }
  const exitAnimation = preview ? { opacity: 0 } : { opacity: 0, y: -50 }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={initialAnimation}
          animate={animateAnimation}
          exit={exitAnimation}
          transition={{ duration: 0.5 }}
          className={clsx(
            preview ? '' : 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
            'flex flex-col items-center',
            className,
          )}
        >
          <div className='bg-purple-900 bg-opacity-90 rounded-lg p-4 shadow-lg border-2 border-purple-500'>
            <div className='flex items-center justify-center mb-2'>
              <GiftIcon className='h-8 w-8 text-yellow-400 mr-2' />
              <h2 className='text-white text-xl font-bold'>Gift Subscription Received!</h2>
            </div>

            <div className='text-center text-white'>
              <p className='text-lg'>
                <span className='font-bold text-yellow-400'>{senderName}</span> gifted you
              </p>
              <p className='text-xl font-bold text-green-400 my-1'>
                {formatGiftType()} of Dotabod Pro
              </p>

              {giftMessage && (
                <div className='p-2 bg-purple-800 rounded-md'>
                  <span className='text-gray-200 text-2xl'>{giftMessage}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default GiftSubscriptionAlert
