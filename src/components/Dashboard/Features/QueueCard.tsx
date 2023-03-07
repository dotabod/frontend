import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import clsx from 'clsx'
import { Settings } from '@/lib/defaultSettings'
import Image from 'next/image'
import { Switch } from 'antd'

export default function QueueCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.queueBlocker)

  return (
    <Card>
      <div className="title">
        <h3>Queue blocker</h3>
      </div>
      <div className="subtitle">
        Stream snipers won&apos;t know what your queue time is to be able to
        snipe you.
      </div>
      <div className="mt-5 flex items-center space-x-2">
        <Switch
          onChange={updateSetting}
          loading={loading}
          checked={isEnabled}
        />
        <span>Enable queue blocker overlay</span>
      </div>
      <div>
        Both the &quot;PLAY DOTA&quot; in the bottom right, and the
        &quot;Finding match&quot; at the top left while in main menu will be
        blocked.
      </div>
      <div
        className={clsx(
          'mt-6 flex flex-col items-center space-y-12 transition-all',
          !isEnabled && 'opacity-40'
        )}
      >
        <div className="flex flex-wrap items-center justify-center space-x-4">
          <Image
            className={clsx(
              'mt-4 inline rounded-xl border-2 border-transparent transition-all'
            )}
            alt="queue blocker"
            width={497}
            height={208}
            src="https://i.imgur.com/PmMjd4V.png"
          />
          <Image
            className={clsx(
              'mt-4 inline rounded-xl border-2 border-transparent transition-all'
            )}
            alt="queue blocker"
            width={204}
            height={247}
            src="https://i.imgur.com/ZHyrR1k.png"
          />
        </div>
      </div>
    </Card>
  )
}
