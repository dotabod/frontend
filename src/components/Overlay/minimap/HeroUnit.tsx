const HeroUnit = ({ data, team }) => {
  const isEnemy = data.teamP !== team
  const unitType = data.unitname
  const isBrewling = unitType.includes('brewmaster')

  const getBrewlingIcon = () => {
    if (isBrewling) {
      const regex = /brewmaster_(\w+)_\d+/
      const match = regex.exec(unitType)
      const type = match?.[1] ?? 'unknown'
      return `/images/overlay/minimap/blocker/icons/units/${type}_brewling.png`
    }
    return ''
  }

  const rotation = isBrewling ? undefined : { transform: `rotate(${data.yaw * -1}deg)` }

  return (
    <div
      className={`container-hero-unit ${unitType} ${isEnemy ? 'enemy' : ''} ${
        isBrewling ? 'brewling' : ''
      }`}
      style={{ bottom: data.yposP, left: data.xposP, ...rotation }}
    >
      {isBrewling && (
        <img
          className={`icon ${isEnemy ? 'enemy' : ''}`}
          src={getBrewlingIcon()}
          alt={`Brewling icon for ${unitType}`}
        />
      )}
    </div>
  )
}

export default HeroUnit
