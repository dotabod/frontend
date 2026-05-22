import type { MinimapUnitProps } from '@/lib/redux/store'

const Creep = ({ data, team }: MinimapUnitProps) => {
  const isEnemy = data.teamP !== team

  const position = {
    bottom: data.yposP,
    left: data.xposP,
  }

  return <div className={`container-creep ${isEnemy ? 'enemy' : ''}`} style={position} />
}

export default Creep
