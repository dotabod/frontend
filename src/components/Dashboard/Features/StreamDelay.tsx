import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Form, Input, InputNumber } from 'antd'
import { useDebouncedCallback } from 'use-debounce'
import { useFeatureAccess } from '@/hooks/useSubscription'

export default function StreamDelayCard() {
  const {
    data: delay,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.streamDelay)
  const { hasAccess, requiredTier } = useFeatureAccess('stream-delay')

  const debouncedUpdate = useDebouncedCallback((value) => {
    updateSetting(value * 1000)
  }, 500)

  return (
    <Card>
      <div className="title">
        <h3>Stream delay</h3>
      </div>
      <div className="subtitle mb-2">
        Increase the delay that Dotabod responds to game events.
      </div>

      <Form layout="vertical">
        <Form.Item label="Delay in seconds" colon={false} help="60 seconds max">
          {!loading && (
            <InputNumber
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
        </Form.Item>
      </Form>
    </Card>
  )
}
