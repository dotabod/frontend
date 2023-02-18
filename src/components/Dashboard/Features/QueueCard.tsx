import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import clsx from 'clsx'
import { Settings } from '@/lib/defaultSettings'
import Image from 'next/image'
import { Switch, Tag } from 'antd'

export default function QueueCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.queueBlocker)

  return (
    <Card>
      <div className="title">
        <h3>
          Queue blocker <Tag color="blue">new</Tag>
        </h3>
        <Switch
          onChange={updateSetting}
          loading={loading}
          checked={isEnabled}
        />
      </div>
      <div className="subtitle">
        Stream snipers won&apos;t know what your queue time is to be able to
        snipe you.
      </div>
      <div>
        Currently only the queue timer in the bottom right will be covered.
      </div>
      <div
        className={clsx(
          'mt-6 flex flex-col items-center space-y-12 transition-all',
          !isEnabled && 'opacity-40'
        )}
      >
        <div className="flex flex-col items-center space-y-4">
          <Image
            className={clsx(
              'rounded-xl border-2 border-transparent transition-all'
            )}
            alt="queue blocker"
            width={600}
            height={600}
            src="/images/dashboard/fake-queue-timer.png"
          />
        </div>
      </div>
    </Card>
  )
}
