import { useWindowSize } from '@/lib/hooks/useWindowSize'
import { useRouter } from 'next/router'

export const useTransformRes = ({ returnInput = true }: { returnInput?: boolean } = {}) => {
  const windowSize = useWindowSize()
  const href = useRouter()

  const res = ({ h = 0, w = 0 }) => {
    return h || w
  }
  return res
}
