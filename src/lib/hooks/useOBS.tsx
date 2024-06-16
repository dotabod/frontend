import { Settings } from '@/lib/defaultSettings'
import { useEffect } from 'react'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useRouter } from 'next/router'

export const useOBS = ({ connected, block }) => {
  const router = useRouter()
  const { userId } = router.query

  const { data: hasSceneSwitcher } = useUpdateSetting(
    Settings['obs-scene-switcher']
  )

  const { data: minimapName } = useUpdateSetting(Settings['obs-minimap'])
  const { data: picksName } = useUpdateSetting(Settings['obs-picks'])
  const { data: dcName } = useUpdateSetting(Settings['obs-dc'])

  useEffect(() => {
    if (!userId || !hasSceneSwitcher) {
      return
    }

    if (!connected) {
      console.log(
        'Socket not connected just yet, will not run OBS scene switchers'
      )

      return
    }

    console.log('Connected to socket! Running OBS scene switchers')

    // Only run in OBS browser source
    if (!hasSceneSwitcher || typeof window !== 'object' || !window?.obsstudio)
      return

    window.obsstudio.getCurrentScene((scene) => {
      const myScenes = [minimapName, picksName, dcName]

      // Some people don't enable the permissions
      if (typeof window.obsstudio.setCurrentScene !== 'function') return

      if (block.type === 'playing') {
        window.obsstudio.setCurrentScene(minimapName)
        return
      }
      if (['picks', 'strategy', 'strategy-2'].includes(block.type)) {
        window.obsstudio.setCurrentScene(picksName)
        return
      }

      // Streamer has a custom scene, lets not override it
      // This allows streamers to make a scene for playing other games, and having
      // dota in the background wont switch scenes on them
      if (myScenes.includes(scene?.name)) {
        window.obsstudio.setCurrentScene(dcName)
        return
      }
    })
  }, [connected, block.type])
}
