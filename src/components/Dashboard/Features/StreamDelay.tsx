import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Form, Input, InputNumber } from 'antd'
import { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

export default function StreamDelayCard() {
  const { data: delay, loading, updateSetting } = useUpdateSetting<number>(Settings.streamDelay)

  // Convert milliseconds to minutes and seconds
  const totalSeconds = Math.abs(Number(delay) || 0) / 1000
  const [minutes, setMinutes] = useState(Math.floor(totalSeconds / 60))
  const [seconds, setSeconds] = useState(Math.floor(totalSeconds % 60))

  // Update local state when delay prop changes
  useEffect(() => {
    const totalSec = Math.abs(Number(delay) || 0) / 1000
    setMinutes(Math.floor(totalSec / 60))
    setSeconds(Math.floor(totalSec % 60))
  }, [delay])

  const debouncedUpdate = useDebouncedCallback((mins: number, secs: number) => {
    const totalMs = (mins * 60 + secs) * 1000
    updateSetting(totalMs)
  }, 500)

  const handleMinutesChange = (value: number | null) => {
    const newMinutes = Math.max(0, Math.min(50, value || 0))
    let newSeconds = seconds

    // If at max minutes (50), seconds must be 0
    if (newMinutes === 50) {
      newSeconds = 0
      setSeconds(0)
    }

    setMinutes(newMinutes)
    debouncedUpdate(newMinutes, newSeconds)
  }

  const handleSecondsChange = (value: number | null) => {
    let newSeconds = Math.max(0, Math.min(59, value || 0))

    // If at max minutes (50), seconds must be 0
    if (minutes === 50) {
      newSeconds = 0
    }

    setSeconds(newSeconds)
    debouncedUpdate(minutes, newSeconds)
  }

  return (
    <Card
      className='relative transition-all duration-200'
      feature='streamDelay'
      title='Stream delay'
    >
      <div className='subtitle mb-2'>Increase the delay that Dotabod responds to game events.</div>

      <Form layout='vertical'>
        <div className='flex gap-4 items-end'>
          <Form.Item label='Minutes' colon={false} className='mb-0'>
            {!loading && (
              <InputNumber
                min={0}
                max={50}
                placeholder='0'
                className='w-[80px]! transition-all'
                value={minutes}
                onChange={handleMinutesChange}
              />
            )}
            {loading && (
              <Input placeholder='Loading...' className='w-[80px] transition-all' disabled />
            )}
          </Form.Item>

          <Form.Item label='Seconds' colon={false} className='mb-0'>
            {!loading && (
              <InputNumber
                min={0}
                max={minutes === 50 ? 0 : 59}
                placeholder='0'
                className='w-[80px]! transition-all'
                value={seconds}
                onChange={handleSecondsChange}
                disabled={minutes === 50}
              />
            )}
            {loading && (
              <Input placeholder='Loading...' className='w-[80px] transition-all' disabled />
            )}
          </Form.Item>
        </div>

        <div className='text-xs text-gray-500 mt-2'>
          Maximum: 50 minutes • Current: {minutes}m {seconds}s
        </div>
      </Form>
    </Card>
  )
}
