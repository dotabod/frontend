export type TransformRes = (dimensions: { h?: number; w?: number }) => number

export const useTransformRes = ({
  returnInput: _returnInput = true,
}: {
  returnInput?: boolean
} = {}): TransformRes => {
  const res: TransformRes = ({ h = 0, w = 0 }) => h || w

  return res
}
