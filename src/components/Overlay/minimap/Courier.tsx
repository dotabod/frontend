import React from 'react'

const Courier = ({ data, team }) => {
  const isEnemy = data.teamP !== team
  const hasIcon = data.image !== 'plaincircle'
  const isFlying = data.image.includes('flying')

  const icon = hasIcon
    ? isFlying
      ? `/images/overlay/minimap/blocker/icons/courier/${data.teamP}_flying.png`
      : `/images/overlay/minimap/blocker/icons/courier/${data.teamP}.png`
    : ''

  return (
    <div
      className={`container-courier ${isEnemy ? 'enemy' : ''}`}
      style={{ bottom: data.yposP, left: data.xposP }}
    >
      {hasIcon && (
        <img
          className={`icon ${isFlying ? 'flying' : ''}`}
          src={icon}
          alt="courier"
        />
      )}
    </div>
  )
}

export default Courier
