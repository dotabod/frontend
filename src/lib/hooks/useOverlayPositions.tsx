import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

interface Position {
  bottom: number
  left: number | null
  right: number | null
}

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

  const wlPosition: Position & { fontSize: number } = {
    bottom: 0,
    right: res({ w: 311 }),
    left: null,
    fontSize: res({ w: 18 }),
  }

  const roshPosition: Position = {
    left: isXL ? res({ w: isSimple ? 280 : 285 }) : res({ w: isSimple ? 243 : 250 }),
    bottom: res({ h: 100 }),
    right: null,
  }

  const minimapPosition: Position = {
    bottom: 0,
    left: 0,
    right: null,
  }

  if (isBp) {
    minimapPosition.bottom += res({ h: 9 })
    if (minimapPosition.left === null) {
      minimapPosition.left = res({ w: 9 })
    } else {
      minimapPosition.left += res({ w: 9 })
    }
    roshPosition.left = isXL ? res({ w: 290 }) : res({ w: 255 })
  }

  if (isRight) {
    roshPosition.right = roshPosition.left ?? 0
    roshPosition.left = null

    minimapPosition.right = minimapPosition.left ?? 0
    minimapPosition.left = null

    wlPosition.left = wlPosition.right ?? 0
    wlPosition.right = null

    if (isBp && minimapPosition.right !== null) {
      minimapPosition.right += res({ w: -3 })
      minimapPosition.bottom += res({ h: -5 })
    }
  }
  return {
    wlPosition: {
      ...wlPosition,
      left: wlPosition.left ?? undefined,
      right: wlPosition.right ?? undefined,
    },
    roshPosition: {
      ...roshPosition,
      left: roshPosition.left ?? undefined,
      right: roshPosition.right ?? undefined,
    },
    minimapPosition: {
      ...minimapPosition,
      left: minimapPosition.left ?? undefined,
      right: minimapPosition.right ?? undefined,
    },
  }
}
