import { motion } from 'framer-motion'
import * as Flags from 'mantine-flagpack'
import { motionProps } from '@/ui/utils'
import { usePlayerPositions } from '@/lib/hooks/useOverlayPositions'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

function NotablePlayer(props: {
  name: string
  position: number
  countryCode: string
}) {
  const res = useTransformRes()
  const FlagComp = Flags[`${props.countryCode.toUpperCase()}Flag`] || null

  return (
    <motion.div
      key="aegis-counter"
      {...motionProps}
      style={{
        top: res({ h: 65 }),
        width: res({ w: 59 }),
        left: props.position + res({ w: 8 }),
      }}
      className={`absolute space-x-1 truncate whitespace-pre-wrap break-all text-center text-sm leading-none text-white/90`}
    >
      {FlagComp && <FlagComp w={30} radius={2} />}
      <div>{props.name}</div>
    </motion.div>
  )
}

export const NotablePlayers = ({ block }: { block: any }) => {
  const { playerPositions } = usePlayerPositions()
  const { data: isEnabled } = useUpdateSetting(Settings.aegis)

  if (!isEnabled || block.type !== 'playing') {
    return null
  }

  const players = [
    { countryCode: 'cn', position: playerPositions[0], name: 'hero' },
    { countryCode: 'cn', position: playerPositions[1], name: 'hero' },
    { countryCode: 'us', position: playerPositions[2], name: 'hero' },
    { countryCode: 'br', position: playerPositions[3], name: 'hero' },
    { countryCode: 'ru', position: playerPositions[4], name: 'hero' },
    { countryCode: 'sa', position: playerPositions[5], name: 'hero' },
    { countryCode: 'fr', position: playerPositions[6], name: 'hero' },
    { countryCode: 'ir', position: playerPositions[7], name: 'hero' },
    { countryCode: 'sn', position: playerPositions[8], name: 'lich' },
    { countryCode: 'in', position: playerPositions[9], name: 'hero' },
  ]

  return (
    <>
      {players.map((player) => (
        <NotablePlayer {...player} />
      ))}
    </>
  )
}
