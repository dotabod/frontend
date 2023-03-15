import { selectTeam } from '@/lib/redux/store'
import React from 'react'
import { useSelector } from 'react-redux'

const Creep = ({ data }) => {
  const team = useSelector(selectTeam)

  const isEnemy = data.teamP !== team

  return (
    <div
      className={`container-creep ${isEnemy ? 'enemy' : ''}`}
      style={{ bottom: data.yposP, left: data.xposP }}
    ></div>
  )
}

export default Creep
