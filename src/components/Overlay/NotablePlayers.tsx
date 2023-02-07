import * as Flags from 'mantine-flagpack'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import React from 'react'
import { PlayerTopbar } from '@/components/Overlay/PlayerTopbar'

export type NotablePlayer = {
  countryCode: string
  position: number
  name: string
}

export const NotablePlayers = ({
  players,
  block,
}: {
  players: NotablePlayer[] | null
  block: any
}) => {
  const { data: isEnabled } = useUpdateSetting(Settings.aegis)

  if (!isEnabled || block.type !== 'playing') {
    return null
  }

  return (
    <div>
      {(players || []).map((player, i) => {
        const FlagComp =
          Flags[`${player.countryCode.toUpperCase()}Flag`] || null

        return (
          <PlayerTopbar key={i} position={player.position}>
            <div className="flex flex-col items-center">
              {FlagComp && <FlagComp w={30} radius={2} />}
              <div className="font-outline-2">{player.name}</div>
            </div>
          </PlayerTopbar>
        )
      })}
    </div>
  )
}
