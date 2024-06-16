import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'

export default function WinProbabilityOverlay() {
  const {
    data: showWinProb,
    updateSetting: updateWinProb,
    loading: l2,
  } = useUpdateSetting(Settings.winProbabilityOverlay)

  return (
    <Card>
      <div className="title">
        <h3>Win probability</h3>
      </div>
      <div className="subtitle">
        Dotabod can display the current win percent chance.
      </div>
      <div>
        For top 100 immortal games, Dotabod can display the current win percent
        chance.
      </div>
      <div className="mt-5 flex items-center space-x-2">
        <Switch loading={l2} onChange={updateWinProb} checked={showWinProb} />
        <span>Show win probability overlay</span>
      </div>

      <Image
        src="https://i.imgur.com/Vr01ilw.gif"
        alt="Win probability oerlay"
        width={1070}
        height={436}
        className={clsx(
          !showWinProb && 'opacity-40',
          'scale-90 rounded shadow'
        )}
      />
    </Card>
  )
}
