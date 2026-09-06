import { Button, Form, Input, InputNumber, Radio, Skeleton } from 'antd'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useWinLoss } from '@/lib/hooks/useWinLoss'
import { Card } from '@/ui/card'

import { TierSwitch } from '../Dashboard/Features/TierSwitch'
import WinLossCard from './wl/WinLossCard'

function getChallengeEndDate(startDate: string, durationDays: number): string {
  const endDate = new Date(`${startDate}T00:00:00.000Z`)
  endDate.setUTCDate(endDate.getUTCDate() + durationDays)
  return endDate.toISOString().slice(0, 10)
}

export default function WinLossOverlay() {
  const userId = useSession().data?.user?.id
  const {
    data: statsDays,
    loading: statsDaysLoading,
    isSaving: statsDaysSaving,
    updateSetting: updateStatsDays,
  } = useUpdateSetting<number | null>(Settings.wlStatsDays)
  const {
    data: statsStartDate,
    loading: statsStartDateLoading,
    isSaving: statsStartDateSaving,
    updateSetting: updateStatsStartDate,
  } = useUpdateSetting<string | null>(Settings.wlStatsStartDate)
  const [draftStatsDays, setDraftStatsDays] = useState<number | null>(() =>
    typeof statsDays === 'number' && Number.isFinite(statsDays) ? statsDays : null,
  )
  const [draftStatsStartDate, setDraftStatsStartDate] = useState<string | null>(() =>
    typeof statsStartDate === 'string' ? statsStartDate : null,
  )
  const [adjustmentLobbyType, setAdjustmentLobbyType] = useState<0 | 7>(7)
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | null>(1)
  const [adjustmentSaving, setAdjustmentSaving] = useState(false)
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null)
  const {
    error: previewError,
    loading: previewLoading,
    refresh: refreshWinLoss,
    wl,
  } = useWinLoss({
    statsDays: draftStatsDays,
    statsStartDate: draftStatsStartDate,
    userId: statsDaysLoading || statsStartDateLoading ? null : userId,
  })

  useEffect(() => {
    if (typeof statsDays === 'number' && Number.isFinite(statsDays)) {
      setDraftStatsDays(statsDays)
      return
    }

    setDraftStatsDays(null)
  }, [statsDays])

  useEffect(() => {
    setDraftStatsStartDate(typeof statsStartDate === 'string' ? statsStartDate : null)
  }, [statsStartDate])

  const challengeConfigured = draftStatsDays !== null && draftStatsStartDate !== null
  const settingsSaving = statsDaysSaving || statsStartDateSaving

  const saveChallenge = () => {
    if (!challengeConfigured) {
      return
    }
    updateStatsStartDate(draftStatsStartDate)
    updateStatsDays(draftStatsDays)
  }

  const endChallenge = () => {
    setDraftStatsDays(null)
    setDraftStatsStartDate(null)
    updateStatsStartDate(null)
    updateStatsDays(null)
  }

  const validAdjustmentAmount =
    adjustmentAmount !== null &&
    Number.isInteger(adjustmentAmount) &&
    adjustmentAmount >= 1 &&
    adjustmentAmount <= 1000

  const adjustWinLoss = async (won: boolean, direction: -1 | 1) => {
    if (!validAdjustmentAmount) {
      return
    }

    setAdjustmentSaving(true)
    setAdjustmentError(null)

    try {
      const response = await fetch('/api/win-loss-adjustments', {
        body: JSON.stringify({
          delta: direction * adjustmentAmount,
          lobbyType: adjustmentLobbyType,
          won,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`Win/loss adjustment failed: ${response.status}`)
      }
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
  const canRemoveWin = validAdjustmentAmount && adjustmentAmount <= (adjustmentRecord?.win ?? 0)
  const canRemoveLoss = validAdjustmentAmount && adjustmentAmount <= (adjustmentRecord?.lose ?? 0)

  return (
    <Card title='Win/loss'>
      <div className='subtitle'>
        Show your win/loss record in the overlay and !wl. Turning this off disables both.
      </div>

      <div className='py-4'>
        <TierSwitch settingKey={Settings.commandWL} label='Show win/loss' />
      </div>

      <div className='mb-6 max-w-md'>
        <div className='mb-1 text-sm font-medium'>Challenge window</div>
        <p aria-live='polite' className='mb-3 text-sm text-gray-400'>
          {challengeConfigured
            ? `Counts matches from ${draftStatsStartDate} until ${getChallengeEndDate(draftStatsStartDate, draftStatsDays)}. It ends automatically and returns to per-stream stats.`
            : 'No challenge active. The counter resets when a new stream starts.'}
        </p>
        <Form layout='vertical'>
          <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]'>
            <Form.Item colon={false} label='Challenge start date' className='mb-0'>
              <Input
                aria-label='Challenge start date'
                disabled={statsStartDateLoading || settingsSaving}
                type='date'
                value={draftStatsStartDate ?? ''}
                onChange={(event) => {
                  setDraftStatsStartDate(event.target.value || null)
                }}
              />
            </Form.Item>
            <Form.Item colon={false} label='Duration' className='mb-0'>
              <InputNumber
                aria-label='Challenge duration'
                className='w-full!'
                disabled={statsDaysLoading || settingsSaving}
                max={365}
                min={1}
                placeholder='30 days'
                precision={0}
                value={draftStatsDays}
                onChange={setDraftStatsDays}
              />
            </Form.Item>
          </div>
          <div className='mt-3 flex flex-wrap gap-2'>
            <Button
              disabled={!challengeConfigured || settingsSaving}
              loading={settingsSaving}
              onClick={saveChallenge}
              type='primary'
            >
              Save challenge
            </Button>
            {(statsDays !== null || statsStartDate !== null) && (
              <Button disabled={settingsSaving} onClick={endChallenge}>
                End challenge
              </Button>
            )}
          </div>
        </Form>
        <p className='mt-2 text-xs text-gray-500'>
          Choose 1–365 days. !today still reports today only.
        </p>
      </div>

      <fieldset className='max-w-md border-0 p-0'>
        <legend className='mb-1 text-sm font-medium'>Manual corrections</legend>
        <p className='mb-3 text-sm text-gray-400'>
          Add games played off stream or correct a missed result. Dotabod stores only this
          correction, not your offline match history. It follows the active challenge or per-stream
          counter.
        </p>
        <Radio.Group
          aria-label='Correction match type'
          disabled={adjustmentSaving}
          onChange={(event) => {
            setAdjustmentLobbyType(event.target.value as 0 | 7)
          }}
          value={adjustmentLobbyType}
        >
          <Radio.Button value={7}>Ranked</Radio.Button>
          <Radio.Button value={0}>Unranked</Radio.Button>
        </Radio.Group>
        <div className='mt-3 flex flex-wrap items-end gap-3'>
          <div>
            <label className='mb-1 block text-xs font-medium text-gray-400' htmlFor='wl-adjustment'>
              Correction amount
            </label>
            <InputNumber
              aria-label='Correction amount'
              className='w-32!'
              disabled={adjustmentSaving}
              id='wl-adjustment'
              max={1000}
              min={1}
              precision={0}
              value={adjustmentAmount}
              onChange={setAdjustmentAmount}
            />
          </div>
          <span className='pb-1 text-xs text-gray-400'>Totals cannot go below zero.</span>
        </div>
        <div className='mt-3 flex flex-wrap gap-2'>
          <Button
            aria-label={`Add ${adjustmentTypeLabel} win`}
            disabled={adjustmentSaving || !validAdjustmentAmount}
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
            disabled={adjustmentSaving || !validAdjustmentAmount}
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
