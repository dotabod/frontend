// add ordinal string to count variable
export const ordinal = (count) => {
  const j = count % 10
  const k = count % 100
  if (j == 1 && k != 11) {
    return count + 'st'
  }
  if (j == 2 && k != 12) {
    return count + 'nd'
  }
  if (j == 3 && k != 13) {
    return count + 'rd'
  }
  return count + 'th'
}
const heroPosition = (teamName: string, i: number) => ({
  top: 4,
  right: teamName === 'radiant' ? null : 115 + i * 125,
  left: teamName === 'dire' ? null : 115 + i * 125,
  height: 55,
  width: 55,
})
export const transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
}
