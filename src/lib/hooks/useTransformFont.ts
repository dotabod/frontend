import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { useRouter } from 'next/router'

export const useTransformFontSize = () => {
  const windowSize = useWindowSize()
  const href = useRouter()

  const fontSize = (size) => {
    if (
      href?.asPath &&
      typeof href.asPath === 'string' &&
      !href.asPath.includes('overlay')
    )
      return size

    // Set the default font size based on 1080p screen size
    const defaultFontSize = size

    // Calculate the aspect ratio of the user's screen
    const screenAspectRatio = windowSize.width / windowSize.height

    // Calculate the aspect ratio of 1080p
    const defaultAspectRatio = 16 / 9

    let fontRatio

    // If the screen aspect ratio is greater than the default aspect ratio, adjust based on width
    if (screenAspectRatio > defaultAspectRatio) {
      fontRatio = windowSize.width / 1920
    }
    // If the screen aspect ratio is less than the default aspect ratio, adjust based on height
    else if (screenAspectRatio < defaultAspectRatio) {
      fontRatio = windowSize.height / 1080
    }
    // If the screen aspect ratio is the same as the default aspect ratio, no adjustment needed
    else {
      fontRatio = 1
    }

    return Math.round(defaultFontSize * fontRatio)
  }

  return fontSize
}
