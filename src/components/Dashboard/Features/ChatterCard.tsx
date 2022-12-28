import { Input } from '@/components/Input'
import { DBSettings, defaultSettings } from '@/lib/DBSettings'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { Card } from '@/ui/card'
import { Button, Switch } from '@mantine/core'
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
        {loading && (
          <Switch
            disabled
            size="lg"
            offLabel="All"
            onLabel="All"
            color="blue"
          />
        )}
        {!loading && (
          <Switch
            size="lg"
            offLabel="All"
            onLabel="All"
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            color="blue"
            defaultChecked={isEnabled}
          />
        )}
      </div>
      <div className="subtitle mb-2">
        The bot can post some random messages as you play your game.
      </div>

      <form
        onSubmit={form.onSubmit((v) => {
          const localV = v as typeof defaultSettings[DBSettings.chatters]
          // delete the description key from each object
          Object.keys(localV).forEach((i) => delete localV[i].description)
          updateChatters(localV)
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
                  {defaultSettings[DBSettings.chatters][key].description}
                </label>

                <div className="flex items-center space-x-3">
                  <Switch
                    size="lg"
                    color="blue"
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
