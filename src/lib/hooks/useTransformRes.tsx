import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { useRouter } from 'next/router'

export const useTransformRes = () => {
  const windowSize = useWindowSize()
  const href = useRouter()

  if (!href.asPath.includes('overlay')) return null

  const res = ({ h = 0, w = 0 }) => {
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
