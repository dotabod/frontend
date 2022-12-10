import { Card } from '@/ui/card'
import { Badge, Loading } from '@geist-ui/core'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import { CommandDetail } from '@/pages/dashboard/commands'
import { Switch } from '@mantine/core'
import { DBSettings, defaultSettings } from '@/lib/DBSettings'
import { Input } from '@/components/Input'
import { useDebouncedCallback } from 'use-debounce'

export default function CommandsCard({
  command,
}: {
  command: typeof CommandDetail.commandAPM
}): JSX.Element {
  const { isEnabled, loading, updateSetting } = useUpdateSetting(command.key)

  const {
    isEnabled: customMmr,
    loading: loadingCustomMmr,
    updateSetting: updateCustomMmr,
  } = useUpdateSetting(DBSettings.customMmr)

  let onChangeMmr = useDebouncedCallback((e) => {
    updateCustomMmr(e.target.value ? e.target.value : defaultSettings.customMmr)
  }, 350)

  return (
    <Card>
      <div className="title command">
        <div className="flex justify-between">
          <div className="flex space-x-2">
            <h3>{command.title}</h3>
            <div className="space-x-2">
              {command.allowed === 'mods' && (
                <>
                  <Badge type="success" className="!bg-green-800" scale={0.5}>
                    Mods
                  </Badge>
                  <Badge type="success" className="!bg-red-800" scale={0.5}>
                    Streamer
                  </Badge>
                </>
              )}
              {command.allowed === 'all' && (
                <>
                  <Badge type="default" scale={0.5}>
                    All
                  </Badge>
                </>
              )}
            </div>
          </div>
          {loading && command.key && (
            <Switch disabled size="lg" className="flex" color="indigo" />
          )}
          {!loading && command.key && (
            <Switch
              size="lg"
              className="flex"
              color="indigo"
              defaultChecked={isEnabled}
              onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            >
              !mmr
            </Switch>
          )}
        </div>
      </div>
      <div className="subtitle">{command.description}</div>
      {command.key === DBSettings.mmrTracker && (
        <div className="py-4">
          <p className="ml-1 pb-1">
            Custom message. Variables: [currentmmr] [currentrank] [nextmmr]
            [wins]
          </p>
          {loadingCustomMmr && (
            <div className="w-52 rounded-md border border-gray-200 pt-2">
              <Loading className="left-0" />
            </div>
          )}
          {!loadingCustomMmr && (
            <Input
              placeholder={defaultSettings.customMmr}
              id="customMmr"
              name="customMmr"
              type="text"
              defaultValue={customMmr}
              onChange={onChangeMmr}
            />
          )}
        </div>
      )}
      {command.response && <command.response dark />}
    </Card>
  )
}
