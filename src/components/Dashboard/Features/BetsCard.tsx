import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { Card } from '@/ui/card'
import { Display } from '@geist-ui/core'
import { Button, Switch } from '@mantine/core'
import { useForm } from '@mantine/form'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect } from 'react'
import { Input } from '../../Input'
import { Settings } from '@/lib/defaultSettings'

export default function BetsCard() {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.bets)
  const {
    data: info,
    loading: loadingInfo,
    updateSetting: updateInfo,
  } = useUpdateSetting(Settings.betsInfo)

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
        {loading && <Switch disabled size="lg" color="blue" />}
        {!loading && (
          <Switch
            size="lg"
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            color="blue"
            defaultChecked={isEnabled}
          />
        )}
      </div>
      <div className="subtitle">Let your chatters bet on your matches.</div>
      <div>
        Chatters can use their native Twitch channel points to bet on whether
        you win or lose a match.
      </div>
      <div className={clsx(!isEnabled && 'opacity-40')}>
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
              <div className="grid grid-cols-1 gap-2 md:grid-cols-1 lg:grid-cols-3">
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
                variant="outline"
                color="green"
                className="border-blue-500 bg-blue-600 text-dark-200 transition-colors hover:bg-blue-500"
                loading={loadingInfo}
                type="submit"
                disabled={!form.isDirty()}
              >
                Save
              </Button>
            </>
          )}
        </form>
        <Display shadow caption="Customize the prediction title and answers.">
          <Image
            alt="bets image"
            width={425}
            height={168}
            src="https://i.imgur.com/8ZsUxJR.png"
            className="bg-gray-500"
          />
        </Display>
      </div>
    </Card>
  )
}
