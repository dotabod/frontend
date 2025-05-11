import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Typography } from 'antd'
import clsx from 'clsx'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

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

const ScrollingText = ({ text, className }: { text: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const textContentRef = useRef(text)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const controls = useAnimationControls()

  // Check for overflow and update measurements when text changes
  useEffect(() => {
    textContentRef.current = text

    // Recalculate on next frame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (textRef.current && containerRef.current) {
        const isTextOverflowing = textRef.current.scrollWidth > containerRef.current.clientWidth
        setIsOverflowing(isTextOverflowing)
      }
    })
  }, [text])

  // Handle the animation
  useEffect(() => {
    let animationCancelled = false

    const startAnimation = async () => {
      if (!isOverflowing || !textRef.current || !containerRef.current) return

      const textElement = textRef.current
      const containerElement = containerRef.current
      const animateDuration = textElement.scrollWidth * 0.015 // Slightly faster animation

      const animate = async () => {
        if (animationCancelled) return

        // Pause at start
        await new Promise((resolve) => setTimeout(resolve, 2000))
        if (animationCancelled) return

        // Scroll to end
        await controls.start({
          x: containerElement.clientWidth - textElement.scrollWidth,
          transition: { duration: animateDuration, ease: 'easeInOut' },
        })
        if (animationCancelled) return

        // Pause at end
        await new Promise((resolve) => setTimeout(resolve, 1500))
        if (animationCancelled) return

        // Scroll back to start
        await controls.start({
          x: 0,
          transition: { duration: animateDuration, ease: 'easeInOut' },
        })

        if (!animationCancelled) {
          animate() // Repeat animation
        }
      }

      animate()
    }

    startAnimation()

    return () => {
      animationCancelled = true
      controls.stop()
    }
  }, [controls, isOverflowing])

  return (
    <div ref={containerRef} className={clsx('overflow-hidden', className)}>
      <motion.div ref={textRef} animate={controls} className='inline-block whitespace-nowrap'>
        {text}
      </motion.div>
    </div>
  )
}

const LastFmCard = ({
  mainScreen = false,
  track,
  className = '',
  transparent = true,
}: LastFmCardProps) => {
  const { data: isEnabled } = useUpdateSetting(Settings.lastFmOverlay)
  const res = useTransformRes()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const fontSize = res({ h: 14 })
  const imageSize = res({ h: 54 })
  const fallbackImage = 'https://cdn.7tv.app/emote/01FWR6BNTR0007SGPMW6AKG0Q9/4x.avif'
  const prevAlbumArtRef = useRef<string | undefined>('')

  // Function to verify if the URL is valid
  const isValidImageUrl = useCallback((url?: string) => {
    if (!url) return false
    return url.startsWith('http://') || url.startsWith('https://')
  }, [])

  // Function to decide what image src to use
  const getImageSrc = useCallback(() => {
    const src = imageError || !isValidImageUrl(track?.albumArt) ? fallbackImage : track?.albumArt
    console.log('Calculated image src:', src)
    return src
  }, [imageError, isValidImageUrl, track?.albumArt])

  useEffect(() => {
    // Reset image states when album art changes
    if (track?.albumArt !== prevAlbumArtRef.current) {
      prevAlbumArtRef.current = track?.albumArt
      setImageLoaded(false)
      setImageError(false)
    }
  }, [track])

  if (!isEnabled || !track) return null

  return (
    <div
      className={clsx(
        'p-2',
        'rounded-lg text-sm shadow-lg transition-all duration-300',
        !transparent && 'bg-gray-900/80 backdrop-blur-md',
        !className && mainScreen && 'bg-transparent p-0 leading-none',
        transparent && 'bg-transparent',
        className,
        'max-w-[320px] shadow-lg shadow-gray-700/20',
      )}
    >
      <div className={clsx('flex items-center gap-2')}>
        <AnimatePresence mode='wait'>
          <motion.div
            key={track.albumArt || 'no-art'}
            className='flex-shrink-0 overflow-hidden rounded-md shadow-md'
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              width: track.albumArt ? imageSize : 0,
              marginRight: track.albumArt ? undefined : 0,
            }}
            exit={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
              width: {
                duration: 0.3,
                ease: 'easeInOut',
              },
            }}
          >
            {track.albumArt && (
              <div className='relative'>
                <motion.img
                  src={getImageSrc()}
                  alt={`${track.album || 'Album'} cover`}
                  width={imageSize}
                  height={imageSize}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: imageLoaded ? 1 : 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className='rounded object-cover rounded-sm'
                  onError={() => {
                    setImageError(true)
                    setImageLoaded(true)
                  }}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <div className='flex-1 overflow-hidden' style={{ fontSize }}>
          <AnimatePresence mode='wait'>
            <motion.div
              key={`${track.title}-${track.artist}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, staggerChildren: 0.1 }}
              className='space-y-1'
            >
              <Text
                strong
                className={clsx(
                  'block m-0 p-0',
                  transparent ? 'text-white drop-shadow-sm' : 'text-gray-100',
                )}
              >
                <ScrollingText text={track.title} />
              </Text>
              <Text
                className={clsx(
                  'block m-0 p-0 text-xs -mt-1',
                  transparent ? 'text-gray-200/90 drop-shadow-sm' : 'text-gray-300',
                )}
              >
                <ScrollingText text={track.artist} />
              </Text>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default LastFmCard
