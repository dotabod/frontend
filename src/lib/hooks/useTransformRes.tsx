export const useTransformRes = () => {
  const res = ({ h = 0, w = 0 }) => {
    return h || w
  }
  return res
}
