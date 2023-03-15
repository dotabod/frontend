import { useSelector } from 'react-redux'
import { selectSettings, selectTeam } from '@/lib/redux/store'

const Building = ({ data }) => {
  const isXL = useSelector(selectSettings)?.size_xl
  const team = useSelector(selectTeam)
  const isEnemy = data.teamP !== team

  const buildingType = () => {
    const { image, unitname } = data
    if (image === 'miscbuilding') {
      return unitname === 'watch_tower' ? 'outpost' : 'filler'
    } else {
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
  }

  return (
    <div
      className={`container-building ${isXL ? 'xl' : ''}`}
      style={{ bottom: data.yposP, left: data.xposP }}
    >
      <img
        alt="building icon"
        className={`icon ${buildingType()}`}
        src={`/images/overlay/minimap/blocker/icons/buildings/${
          isEnemy ? 'enemy_' : ''
        }${data.image}.png`}
      />
    </div>
  )
}

export default Building
