import { Card } from '@/ui/card'
import { Display } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { DBSettings } from '@/lib/DBSettings'
import Image from 'next/image'
import { Button, Switch } from '@mantine/core'
import { Input } from '../../Input'
import { useForm } from '@mantine/form'
import { useEffect } from 'react'

export default function BetsCard() {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(
    DBSettings.bets
  )
  const {
    isEnabled: info,
    loading: loadingInfo,
    updateSetting: updateInfo,
  } = useUpdateSetting(DBSettings.betsInfo)

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
        {loading && <Switch disabled size="lg" color="indigo" />}
        {!loading && (
          <Switch
            size="lg"
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            color="indigo"
            defaultChecked={isEnabled}
          />
        )}
      </div>
      <div className="subtitle">Let your chatters bet on your matches.</div>
      <div>
        Chatters can use their native Twitch channel points to bet on whether
        you win or lose a match.
      </div>
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
              loading={loadingInfo}
              type="submit"
              disabled={!form.isDirty()}
            >
              Save
            </Button>
          </>
        )}
      </form>
      <Display
        shadow
        caption={
          <div className="space-x-1 text-sm text-gray-500">
            <p className="inline">
              Customize the prediction title and answers.
            </p>
          </div>
        }
      >
        <Image
          alt="bets image"
          width={400}
          height={640}
          src="/images/bets.png"
          className="bg-gray-500"
        />
      </Display>
    </Card>
  )
}
