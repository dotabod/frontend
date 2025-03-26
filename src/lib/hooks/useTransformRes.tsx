export const useTransformRes = ({ returnInput = true }: { returnInput?: boolean } = {}) => {
  const res = ({ h = 0, w = 0 }) => {
    return h || w
  }

  return res
}
