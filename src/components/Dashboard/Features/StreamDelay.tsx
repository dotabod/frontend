import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Settings } from '@/lib/defaultSettings'
import { Input } from 'antd'
import { useDebouncedCallback } from 'use-debounce'

export default function StreamDelayCard() {
  const {
    data: delay,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.streamDelay)

  const debouncedUpdate = useDebouncedCallback((e) => {
    updateSetting(Math.abs(Number(e.target.value) * 1000))
  }, 500)

  return (
    <Card>
      <div className="title">
        <h3>Stream delay</h3>
      </div>
      <div className="subtitle mb-2">
        Increase the delay that Dotabod responds to game events. For example,
        write 15 for 15 seconds.
      </div>

      <div>
        {!loading && (
          <Input
            type="number"
            min={0}
            max={60}
            placeholder="0 seconds"
            className="!w-[200px] transition-all"
            defaultValue={Math.abs(Number(delay) || 0) / 1000}
            onChange={debouncedUpdate}
          />
        )}
        {loading && (
          <Input
            placeholder="Loading..."
            className="max-w-fit transition-all"
            disabled
          />
        )}
      </div>
    </Card>
  )
}
