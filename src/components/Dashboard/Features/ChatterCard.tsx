import { Card } from '@/ui/card'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { DBSettings, defaultSettings } from '@/lib/DBSettings'
import { Button, Switch } from '@mantine/core'
import { Input } from '@/components/Input'
import { useForm } from '@mantine/form'
import { useEffect } from 'react'

export default function ChatterCard() {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(
    DBSettings.chatter
  )
  const {
    isEnabled: dbChatters,
    loading: loadingChatters,
    updateSetting: updateChatters,
  } = useUpdateSetting(DBSettings.chatters)

  const chatters = dbChatters as typeof defaultSettings[DBSettings.chatters]
  const form = useForm({ initialValues: chatters })

  useEffect(() => {
    if (chatters && !loadingChatters) {
      form.setValues(chatters)
      form.resetDirty(chatters)
    }
  }, [loadingChatters])

  return (
    <Card>
      <div className="title">
        <h3>Chatter</h3>
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
      <div className="subtitle mb-2">
        The bot can post some random messages as you play your game.
      </div>

      <form
        onSubmit={form.onSubmit((v) => {
          updateChatters(v)
          form.resetDirty()
        })}
        className="mt-6 space-y-2"
      >
        <div className="space-y-6">
          {Object.keys(chatters).map((key) => {
            return (
              <div key={key}>
                <label
                  htmlFor={key}
                  className="mb-2 flex items-start justify-start text-sm font-medium text-dark-400 "
                >
                  {chatters[key].description}
                </label>

                <div className="flex items-center space-x-3">
                  <Switch
                    size="lg"
                    color="indigo"
                    disabled={!isEnabled}
                    {...form.getInputProps(`${key}.enabled`, {
                      type: 'checkbox',
                    })}
                  />
                  <Input
                    id={key}
                    maxLength={500}
                    placeholder={chatters[key].message}
                    className="w-full"
                    disabled={!form.values[key].enabled || !isEnabled}
                    {...form.getInputProps(`${key}.message`)}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <Button
          type="submit"
          variant="outline"
          color="green"
          className="border-blue-500 bg-blue-600 text-dark-200 transition-colors hover:bg-blue-500"
          loading={loadingChatters}
          disabled={!form.isDirty()}
        >
          Save
        </Button>
      </form>
    </Card>
  )
}
