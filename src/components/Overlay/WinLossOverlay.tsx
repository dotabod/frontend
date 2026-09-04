import { Form, Input, InputNumber, Skeleton } from 'antd'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useWinLoss } from '@/lib/hooks/useWinLoss'
import { Card } from '@/ui/card'
import { TierSwitch } from '../Dashboard/Features/TierSwitch'
import WinLossCard from './wl/WinLossCard'

export default function WinLossOverlay() {
  const userId = useSession().data?.user?.id
  const {
    data: statsDays,
    loading: statsDaysLoading,
    isSaving: statsDaysSaving,
    updateSetting: updateStatsDays,
  } = useUpdateSetting<number | null>(Settings.wlStatsDays)
  const [draftStatsDays, setDraftStatsDays] = useState<number | null>(() =>
    typeof statsDays === 'number' && Number.isFinite(statsDays) ? statsDays : null,
  )
  const debouncedUpdateStatsDays = useDebouncedCallback(updateStatsDays, 500)
  const {
    error: previewError,
    loading: previewLoading,
    wl,
  } = useWinLoss({
    statsDays: draftStatsDays,
    userId: statsDaysLoading ? null : userId,
  })

  useEffect(() => {
    if (typeof statsDays === 'number' && Number.isFinite(statsDays)) {
      setDraftStatsDays(statsDays)
      return
    }

    setDraftStatsDays(null)
  }, [statsDays])

  useEffect(() => () => debouncedUpdateStatsDays.cancel(), [debouncedUpdateStatsDays])

  const handleStatsDaysChange = (value: number | null) => {
    if (value === null) {
      debouncedUpdateStatsDays.cancel()
      setDraftStatsDays(null)
      updateStatsDays(null)
      return
    }

    setDraftStatsDays(value)
    debouncedUpdateStatsDays(value)
  }

  return (
    <Card title='Win/loss'>
      <div className='subtitle'>
        Show your win/loss record in the overlay and !wl. Turning this off disables both.
      </div>

      <div className='py-4'>
        <TierSwitch settingKey={Settings.commandWL} label='Show win/loss' />
      </div>

      <Form layout='vertical' className='max-w-xs'>
        <Form.Item
          colon={false}
          label='Stats window'
          extra={
            <div className='space-y-1'>
              <div aria-live='polite'>
                {draftStatsDays === null
                  ? 'This stream · Resets when a new stream starts'
                  : `Last ${draftStatsDays} ${draftStatsDays === 1 ? 'day' : 'days'} · Keeps counting across streams`}
              </div>
              <div>
                Leave blank for each stream, or enter 1–365 days. !today always shows today's stats.
              </div>
            </div>
          }
        >
          {statsDaysLoading ? (
            <Input aria-label='Stats window' placeholder='Loading...' disabled />
          ) : (
            <div className='flex items-center gap-2'>
              <InputNumber
                aria-label='Stats window'
                min={1}
                max={365}
                precision={0}
                placeholder='This stream'
                className='w-32!'
                disabled={statsDaysSaving}
                value={draftStatsDays}
                onChange={handleStatsDaysChange}
              />
              <span className='w-8 text-sm text-gray-400'>
                {draftStatsDays === null ? null : draftStatsDays === 1 ? 'day' : 'days'}
              </span>
            </div>
          )}
        </Form.Item>
      </Form>

      <div className='my-6 flex min-h-12 flex-col items-center justify-center gap-2'>
        <span className='text-xs font-medium text-gray-500'>Your record</span>
        {previewLoading || !wl ? (
          <Skeleton.Input active size='small' style={{ height: 34, width: 132 }} />
        ) : (
          <WinLossCard wl={wl} />
        )}
        {previewError && <span className='text-xs text-gray-400'>Preview unavailable</span>}
      </div>
    </Card>
  )
}
