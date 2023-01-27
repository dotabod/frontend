import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Settings } from '@/lib/defaultSettings'
import { Input } from '@/components/Input'
import { Badge } from '@mantine/core'
import { useDebouncedCallback } from 'use-debounce'

export default function StreamDelayCard() {
  const {
    data: delay,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.streamDelay)

  const debouncedUpdate = useDebouncedCallback((e) => {
    updateSetting(Number(e.target.value))
  }, 500)

  return (
    <Card>
      <div className="title">
        <h3>
          Stream delay <Badge>beta</Badge>
        </h3>
      </div>
      <div className="subtitle mb-2">
        Increase the delay that Dotabod responds to game events. For example,
        write 15 for 15 seconds.
      </div>

      <div>
        {!loading && (
          <Input
            type="number"
            placeholder="0 seconds"
            className="max-w-fit transition-all"
            defaultValue={delay}
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
