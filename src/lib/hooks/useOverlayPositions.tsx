import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

export const usePlayerPositions = () => {
  const res = useTransformRes()

  const spaceFromLeft = 472
  const initialSize = 62
  const gapSize = 513

  // there are 5 on left, 5 on right
  const firstFive = Array.from({ length: 5 }, (_, i) => i).map((i) => {
    return initialSize * (i + 1) + spaceFromLeft
  })
  // repeat(5, 111px) 356px repeat(5, 111px)
  const playerPositions = [
    ...firstFive, // left
    ...firstFive.map((w, i) => w + gapSize), // right
  ].map((w) => res({ w }))

  return { playerPositions }
}

export const useOverlayPositions = () => {
  const res = useTransformRes()

  const { data: isSimple } = useUpdateSetting(Settings['minimap-simple'])
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)
  const { data: isBp } = useUpdateSetting(Settings.battlepass)

  let wlPosition = {
    bottom: 0,
    right: res({ w: 311 }),
    left: null,
    fontSize: res({ w: 18 }),
  }

  let roshPosition = {
    left: isXL
      ? res({ w: isSimple ? 280 : 285 })
      : res({ w: isSimple ? 243 : 250 }),
    bottom: res({ h: 100 }),
    right: null,
  }

  let minimapPosition = {
    bottom: 0,
    left: 0,
    right: null,
  }

  if (isBp) {
    minimapPosition.bottom += res({ h: 9 })
    minimapPosition.left += res({ w: 9 })
    roshPosition.left = isXL ? res({ w: 290 }) : res({ w: 255 })
  }

  if (isRight) {
    roshPosition.right = roshPosition.left
    roshPosition.left = null

    minimapPosition.right = minimapPosition.left
    minimapPosition.left = null

    wlPosition.left = wlPosition.right
    wlPosition.right = null

    if (isBp) {
      minimapPosition.right += res({ w: -3 })
      minimapPosition.bottom += res({ h: -5 })
    }
  }
  return {
    wlPosition,
    roshPosition,
    minimapPosition,
  }
}
