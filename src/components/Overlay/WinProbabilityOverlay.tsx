import clsx from 'clsx'
import Image from 'next/image'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { TierSwitch } from '../Dashboard/Features/TierSwitch'

export default function WinProbabilityOverlay() {
  const { data: showWinProb } = useUpdateSetting(Settings.winProbabilityOverlay)

  return (
    <Card title='Win probability' feature='winProbabilityOverlay'>
      <div className='subtitle'>Dotabod can display the current win percent chance.</div>
      <div>For top 100 immortal games, Dotabod can display the current win percent chance.</div>
      <div className='mt-5'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.winProbabilityOverlay}
          label='Show win probability overlay'
        />
      </div>

      <Image
        src='https://i.imgur.com/Vr01ilw.gif'
        alt='Win probability oerlay'
        width={1070}
        height={436}
        className={clsx(!showWinProb && 'opacity-40', 'scale-90 rounded-sm shadow-sm')}
      />
    </Card>
  )
}
