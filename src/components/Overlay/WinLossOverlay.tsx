import { Button, Form, Input, InputNumber, Radio, Skeleton } from 'antd'
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
  const [adjustmentLobbyType, setAdjustmentLobbyType] = useState<0 | 7>(7)
  const [adjustmentSaving, setAdjustmentSaving] = useState(false)
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null)
  const debouncedUpdateStatsDays = useDebouncedCallback(updateStatsDays, 500)
  const {
    error: previewError,
    loading: previewLoading,
    refresh: refreshWinLoss,
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

  const adjustWinLoss = async (won: boolean, delta: -1 | 1) => {
    setAdjustmentSaving(true)
    setAdjustmentError(null)

    try {
      const response = await fetch('/api/win-loss-adjustments', {
        body: JSON.stringify({ delta, lobbyType: adjustmentLobbyType, won }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!response.ok) throw new Error(`Win/loss adjustment failed: ${response.status}`)
      refreshWinLoss()
    } catch {
      setAdjustmentError("Couldn't update the record. Try again.")
    } finally {
      setAdjustmentSaving(false)
    }
  }

  const adjustmentTypeLabel = adjustmentLobbyType === 7 ? 'ranked' : 'unranked'
  const adjustmentRecordType = adjustmentLobbyType === 7 ? 'R' : 'U'
  const adjustmentRecord = wl?.records.find((record) => record.type === adjustmentRecordType)
  const canRemoveWin = (adjustmentRecord?.win ?? 0) > 0
  const canRemoveLoss = (adjustmentRecord?.lose ?? 0) > 0

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

      <fieldset className='max-w-md border-0 p-0'>
        <legend className='mb-1 text-sm font-medium'>Manual corrections</legend>
        <p className='mb-3 text-sm text-gray-400'>
          Add games played off stream or correct a missed result. Dotabod stores only this
          correction, not your offline match history. It follows the same stats window and reset as
          the counter.
        </p>
        <Radio.Group
          aria-label='Correction match type'
          disabled={adjustmentSaving}
          onChange={(event) => setAdjustmentLobbyType(event.target.value as 0 | 7)}
          value={adjustmentLobbyType}
        >
          <Radio.Button value={7}>Ranked</Radio.Button>
          <Radio.Button value={0}>Unranked</Radio.Button>
        </Radio.Group>
        <div className='mt-3 flex flex-wrap gap-2'>
          <Button
            aria-label={`Add ${adjustmentTypeLabel} win`}
            disabled={adjustmentSaving}
            onClick={() => void adjustWinLoss(true, 1)}
          >
            + Win
          </Button>
          <Button
            aria-label={`Remove ${adjustmentTypeLabel} win`}
            disabled={adjustmentSaving || !canRemoveWin}
            onClick={() => void adjustWinLoss(true, -1)}
          >
            − Win
          </Button>
          <Button
            aria-label={`Add ${adjustmentTypeLabel} loss`}
            disabled={adjustmentSaving}
            onClick={() => void adjustWinLoss(false, 1)}
          >
            + Loss
          </Button>
          <Button
            aria-label={`Remove ${adjustmentTypeLabel} loss`}
            disabled={adjustmentSaving || !canRemoveLoss}
            onClick={() => void adjustWinLoss(false, -1)}
          >
            − Loss
          </Button>
        </div>
        {adjustmentError ? (
          <p aria-live='polite' className='mt-2 text-sm text-red-400'>
            {adjustmentError}
          </p>
        ) : null}
      </fieldset>

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
