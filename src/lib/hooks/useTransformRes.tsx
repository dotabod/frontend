import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { useRouter } from 'next/router'

export const useTransformRes = () => {
  const windowSize = useWindowSize()
  const router = useRouter()

  /**
   * Transforms the input height or width based on the current window size.
   *
   * @param {Object} params - The parameters for transformation.
   * @param {number} [params.h=0] - The height to transform.
   * @param {number} [params.w=0] - The width to transform.
   * @returns {number} - The transformed height or width.
   */
  const res = ({ h = 0, w = 0 }) => {
    // If the current path doesn't include 'overlay', return the height or width as is
    if (
      router?.asPath &&
      typeof router.asPath === 'string' &&
      !router.asPath.includes('overlay')
    ) {
      return h || w
    }

    const { width, height } = windowSize || {}
    if (!width || !height) {
      // If window size is not available, return the original value
      return h || w
    }

    // Define base dimensions (you can adjust these as needed)
    const baseWidth = 1920
    const baseHeight = 1080

    // Calculate scaling ratios based on base dimensions
    const widthRatio = width / baseWidth
    const heightRatio = height / baseHeight

    // Transform the input height or width based on the scaling ratios
    if (h) {
      return h * heightRatio
    }

    if (w) {
      return w * widthRatio
    }

    // If neither h nor w is provided, return 0 or handle as needed
    return 0
  }

  return res
}
