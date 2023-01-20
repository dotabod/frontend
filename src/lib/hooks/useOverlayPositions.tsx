import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

export const usePlayerPositions = () => {
  const res = useTransformRes()

  const playerPositions = [
    555, 615, 680, 745, 800, 1065, 1130, 1192, 1250, 1320,
  ].map((w) => res({ w: w - 20 }))

  return { playerPositions }
}

export const useOverlayPositions = ({ isLeaderboard = false } = {}) => {
  const res = useTransformRes()

  const { data: isSimple } = useUpdateSetting(Settings['minimap-simple'])
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)
  const { data: isBp } = useUpdateSetting(Settings.battlepass)

  let badgePosition = {
    bottom: 0,
    right: res({ w: 276 }),
    left: null,
    top: null,
  }

  let wlPosition = {
    bottom: 0,
    right: res({ w: isLeaderboard ? 367 : 366 }),
    left: null,
    fontSize: res({ w: 22 }),
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

    badgePosition.left = badgePosition.right
    badgePosition.right = null

    if (isBp) {
      minimapPosition.right += res({ w: -3 })
      minimapPosition.bottom += res({ h: -5 })
    }
  }
  return {
    badgePosition,
    wlPosition,
    roshPosition,
    minimapPosition,
  }
}
