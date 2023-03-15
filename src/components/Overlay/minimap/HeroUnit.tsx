import { selectTeam } from '@/lib/redux/store'
import React from 'react'
import { useSelector } from 'react-redux'
import styles from './HeroUnit.module.css'

const HeroUnit = ({ data }) => {
  const isEnemy = data.teamP !== useSelector(selectTeam)
  const unitType = data.unitname
  const isBrewling = unitType.includes('brewmaster')

  const getBrewlingIcon = () => {
    if (isBrewling) {
      const regex = /brewmaster_(\w+)_\d+/
      const type = regex.exec(unitType)[1]
      return `/images/overlay/minimap/blocker/icons/units/${type}_brewling.png`
    }
    return ''
  }

  const rotation = isBrewling
    ? undefined
    : { transform: `rotate(${data.yaw * -1}deg)` }

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
        />
      )}
    </div>
  )
}

export default HeroUnit
