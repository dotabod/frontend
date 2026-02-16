import clsx from 'clsx'
import * as Flags from 'mantine-flagpack'
import { PlayerTopbar } from '@/components/Overlay/PlayerTopbar'
import { Settings } from '@/lib/defaultSettings'
import type { blockType } from '@/lib/devConsts'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

export type NotablePlayer = {
  heroId: number
  account_id: number
  position: number
  heroName: string
  name: string
  image?: string
  isMe: boolean
  country_code?: string
}

export const NotablePlayers = ({
  players,
  block,
}: {
  players: NotablePlayer[] | null
  block: blockType
}) => {
  const { data: isEnabled } = useUpdateSetting(Settings.notablePlayersOverlay)
  const { data: showFlags } = useUpdateSetting(Settings.notablePlayersOverlayFlags)

  if (!isEnabled || !['spectator', 'playing'].includes(block.type || '')) {
    return null
  }

  return (
    <div id='notable-players'>
      {(players || []).map((player, i) => {
        const flagKey = `${player.country_code?.toUpperCase()}Flag`
        // biome-ignore lint/performance/noDynamicNamespaceImportAccess: Flag components are dynamically selected by country code
        const FlagComp = player.country_code ? Flags[flagKey] : null

        return (
          <PlayerTopbar key={i} position={player.position}>
            <div className='flex flex-col items-center'>
              <div>
                <div className={clsx(!showFlags && 'hidden')}>
                  {FlagComp ? <FlagComp w={30} radius={2} /> : <div style={{ height: 22.5 }} />}
                </div>
              </div>

              <div className={clsx('font-outline-2 pb-1')}>{player.name}</div>
            </div>
          </PlayerTopbar>
        )
      })}
    </div>
  )
}
