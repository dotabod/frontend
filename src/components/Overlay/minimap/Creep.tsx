const Creep = ({ data, team }) => {
  const isEnemy = data.teamP !== team

  const position = {
    bottom: data.yposP,
    left: data.xposP,
  }

  return (
    <div
      className={`container-creep ${isEnemy ? 'enemy' : ''}`}
      style={position}
    />
  )
}

export default Creep
