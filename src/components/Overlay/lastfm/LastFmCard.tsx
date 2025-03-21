import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Typography } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const { Text } = Typography

type LastFmTrackType = {
  artist: string
  title: string
  album?: string
  albumArt?: string
  url?: string
}

type LastFmCardProps = {
  mainScreen?: boolean
  track: LastFmTrackType | null
  className?: string
  transparent?: boolean
  compact?: boolean
}

const LastFmCard = ({
  mainScreen = false,
  track,
  className = '',
  transparent = true,
  compact = true,
}: LastFmCardProps) => {
  const { data: isEnabled } = useUpdateSetting(Settings.lastFmOverlay)
  const res = useTransformRes()
  const [imageLoaded, setImageLoaded] = useState(false)

  if (!isEnabled || !track) return null

  const fontSize = res({ h: compact ? 14 : 16 })
  const imageSize = res({ h: compact ? 64 : 128 })

  return (
    <div
      className={clsx(
        'rounded-lg border border-gray-700 p-2 text-sm text-gray-300 shadow-lg transition-all hover:border hover:border-gray-600 hover:shadow-gray-500/10',
        !className && 'rounded-l-none',
        !className && mainScreen && 'bg-transparent p-0 leading-none text-white',
        transparent && 'bg-transparent',
        compact && 'p-2',
        className,
        'max-w-[300px]',
      )}
    >
      <div className={clsx('flex items-center gap-2', compact && 'gap-1')}>
        <AnimatePresence mode='wait'>
          {track.albumArt && (
            <motion.div
              key={track.albumArt}
              className='flex-shrink-0'
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 0.8 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src={track.albumArt}
                alt={`${track.album || 'Album'} cover`}
                width={imageSize}
                height={imageSize}
                className={clsx('rounded', compact && 'rounded-sm')}
                onLoad={() => setImageLoaded(true)}
                onLoadingComplete={() => setImageLoaded(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div className='overflow-hidden' style={{ fontSize }}>
          <AnimatePresence mode='wait'>
            <motion.div
              key={`${track.title}-${track.artist}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Text strong className={clsx('block truncate', transparent && 'text-white')}>
                {track.title}
              </Text>
              <Text
                className={clsx(
                  'block truncate',
                  compact ? 'text-xs' : 'text-sm',
                  'opacity-80',
                  transparent && 'text-white',
                )}
              >
                {track.artist}
              </Text>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default LastFmCard
