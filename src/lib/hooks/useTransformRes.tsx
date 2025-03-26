import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { useRouter } from 'next/router'

export const useTransformRes = ({ returnInput = true }: { returnInput?: boolean } = {}) => {
  const windowSize = useWindowSize()
  const href = useRouter()

  const res = ({ h = 0, w = 0 }) => {
    if (href?.asPath && typeof href.asPath === 'string' && !href.asPath.includes('overlay'))
      return h || w

    if (returnInput) {
      return h || w
    }

    const defaultWidth = 1920
    const defaultHeight = 1080

    const widthRatio = (windowSize?.width || defaultWidth) / defaultWidth
    const heightRatio = (windowSize?.height || defaultHeight) / defaultHeight

    if (h) {
      return h * heightRatio || h
    }

    return w * widthRatio || w
  }
  return res
}
