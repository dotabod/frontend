import { useState } from 'react'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

const Building = ({ data, team }) => {
  const [imageError, setImageError] = useState(false)
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const isEnemy = data.teamP !== team

  if (!data.image || imageError) return null

  const handleImageError = () => {
    setImageError(true)
  }

  const buildingType = () => {
    const { image, unitname } = data
    if (image === 'miscbuilding') {
      return unitname === 'watch_tower' ? 'outpost' : 'filler'
    }
    return image
      .replace('45', '')
      .replace('90', '')
      .replace('range', '')
      .replace('melee', '')
      .replace('top', '')
      .replace('mid', '')
      .replace('bottom', '')
      .replace('_', '')
  }

  if (!data.image) return null

  const image = data.image.replace(/sword|shield/g, 'miscbuilding')

  return (
    <div
      className={`container-building ${isXL ? 'xl' : ''}`}
      style={{ bottom: data.yposP, left: data.xposP }}
    >
      <img
        className={`icon ${buildingType()}`}
        src={`/images/overlay/minimap/blocker/icons/buildings/${
          isEnemy ? 'enemy_' : ''
        }${image}.png`}
        alt={`${isEnemy ? 'Enemy' : 'Friendly'} ${buildingType()} building`}
        onError={handleImageError}
        style={{ display: imageError ? 'none' : 'block' }}
      />
    </div>
  )
}

export default Building
