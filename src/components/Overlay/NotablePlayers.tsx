import * as Flags from 'mantine-flagpack'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import React from 'react'
import { PlayerTopbar } from '@/components/Overlay/PlayerTopbar'
import clsx from 'clsx'

export type NotablePlayer = {
  heroId: number
  account_id: number
  position: number
  heroName: string
  name: string
  country_code?: string
}

export const NotablePlayers = ({
  players,
  block,
}: {
  players: NotablePlayer[] | null
  block: any
}) => {
  const { data: isEnabled } = useUpdateSetting(Settings.notablePlayersOverlay)
  const { data: showFlags } = useUpdateSetting(
    Settings.notablePlayersOverlayFlags
  )

  if (!isEnabled || !['spectator', 'playing'].includes(block.type)) {
    return null
  }

  return (
    <div>
      {(players || []).map((player, i) => {
        const FlagComp = player.country_code
          ? Flags[`${player.country_code.toUpperCase()}Flag`]
          : null

        return (
          <PlayerTopbar key={i} position={player.position}>
            <div className="flex flex-col items-center">
              <div className={clsx(!showFlags && 'hidden')}>
                {FlagComp ? (
                  <FlagComp w={30} radius={2} />
                ) : (
                  <div style={{ height: 22.5 }} />
                )}
              </div>
              <div className="font-outline-2">{player.name}</div>
            </div>
          </PlayerTopbar>
        )
      })}
    </div>
  )
}
