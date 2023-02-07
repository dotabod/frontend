import * as Flags from 'mantine-flagpack'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import React from 'react'
import { PlayerTopbar } from '@/components/Overlay/PlayerTopbar'

export const NotablePlayers = ({ block }: { block: any }) => {
  const { data: isEnabled } = useUpdateSetting(Settings.aegis)

  if (!isEnabled || block.type !== 'playing') {
    return null
  }

  const players = [
    {
      countryCode: 'cn',
      position: 0,
      name: 'hesro asd asda dsdasd',
    },
    { countryCode: 'cn', position: 1, name: 'hero' },
    { countryCode: 'us', position: 2, name: 'hero' },
    { countryCode: 'br', position: 3, name: 'hero' },
    { countryCode: 'ru', position: 4, name: 'hero' },
    { countryCode: 'sa', position: 5, name: 'hero' },
    { countryCode: 'fr', position: 6, name: 'hero' },
    { countryCode: 'ir', position: 7, name: 'hero' },
    { countryCode: 'sn', position: 8, name: 'lich' },
    { countryCode: 'in', position: 9, name: 'hero' },
  ]

  return (
    <div>
      {players.map((player, i) => {
        const FlagComp =
          Flags[`${player.countryCode.toUpperCase()}Flag`] || null

        return (
          <PlayerTopbar key={i} position={player.position}>
            <div className="flex flex-col items-center">
              {FlagComp && <FlagComp w={30} radius={2} />}
              <div>{player.name}</div>
            </div>
          </PlayerTopbar>
        )
      })}
    </div>
  )
}
