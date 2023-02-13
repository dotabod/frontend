import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Button, Switch } from 'antd'
import { useForm } from '@mantine/form'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect } from 'react'
import { Input } from '../../Input'
import { Settings } from '@/lib/defaultSettings'

export default function BetsCard() {
  const {
    data: isEnabled,
    loading: l0,
    updateSetting,
  } = useUpdateSetting(Settings.bets)
  const {
    data: info,
    loading: l1,
    updateSetting: updateInfo,
  } = useUpdateSetting(Settings.betsInfo)
  const {
    data: showLivePolls,
    updateSetting: updateLivePoll,
    loading: l2,
  } = useUpdateSetting(Settings.livePolls)
  const loadingInfo = l0 || l1 || l2

  const form = useForm({ initialValues: info })

  useEffect(() => {
    if (info && !loadingInfo) {
      form.setValues(info)
      form.resetDirty(info)
    }
  }, [loadingInfo])

  useEffect(() => {
    form.resetDirty()
    form.resetTouched()
  }, [])

  return (
    <Card>
      <div className="title">
        <h3>Twitch predictions</h3>
        <Switch onChange={updateSetting} checked={isEnabled} />
      </div>
      <div className="subtitle">Let your chatters bet on your matches.</div>
      <div>
        Chatters can use their native Twitch channel points to bet on whether
        you win or lose a match.
      </div>
      <div className="mt-5 flex items-center space-x-2">
        <Switch
          loading={l2}
          onChange={updateLivePoll}
          checked={showLivePolls}
        />
        <span>Show live betting / polls overlay</span>
      </div>
      <div
        className={clsx(!isEnabled && 'opacity-40', 'space-y-6 transition-all')}
      >
        <form
          onSubmit={form.onSubmit((v) => {
            updateInfo(v)
            form.resetDirty()
          })}
          className="mt-6 space-y-2"
        >
          <label htmlFor="name" className="block text-sm">
            Title. Variables: [heroname]
          </label>
          {loadingInfo && <Input placeholder="Loading..." disabled />}
          {!loadingInfo && (
            <>
              <Input
                id="name"
                placeholder="Title"
                maxLength={45}
                {...form.getInputProps(`title`)}
              />
              <div className="flex flex-col">
                <div>
                  <label htmlFor="yes" className="block text-sm">
                    Yes
                  </label>
                  <Input
                    style={{ width: 208 }}
                    id="yes"
                    maxLength={25}
                    placeholder="Yes"
                    {...form.getInputProps(`yes`)}
                  />
                </div>
                <div>
                  <label htmlFor="no" className="block text-sm">
                    No
                  </label>
                  <Input
                    style={{ width: 208 }}
                    id="no"
                    maxLength={25}
                    placeholder="No"
                    {...form.getInputProps(`no`)}
                  />
                </div>
                <div>
                  <label htmlFor="duration" className="block text-sm">
                    Seconds open
                  </label>
                  <Input
                    id="duration"
                    style={{ width: 208 }}
                    min={30}
                    max={1800}
                    placeholder="240"
                    type="number"
                    {...form.getInputProps(`duration`)}
                  />
                </div>
              </div>
              <Button
                type="primary"
                htmlType="submit"
                loading={loadingInfo}
                disabled={!form.isDirty()}
              >
                Save
              </Button>
            </>
          )}
        </form>
        <div className="flex flex-col items-center space-y-4">
          <Image
            alt="bets image"
            width={425}
            height={168}
            src="https://i.imgur.com/8ZsUxJR.png"
            className="bg-gray-500"
          />
          <span>Customize the prediction title and answers.</span>
        </div>
      </div>
    </Card>
  )
}
