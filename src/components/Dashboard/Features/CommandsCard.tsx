import { Input } from '@/components/Input'
import { DBSettings, defaultSettings } from '@/lib/DBSettings'
import { useUpdateSetting } from '@/lib/useUpdateSetting'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import { Card } from '@/ui/card'
import { Badge, Loading } from '@geist-ui/core'
import { Accordion, Switch } from '@mantine/core'
import { useDebouncedCallback } from 'use-debounce'

export default function CommandsCard({
  id,
  command,
}: {
  id: string
  command: typeof CommandDetail.commandAPM
}): JSX.Element {
  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(command.key)

  const {
    data: customMmr,
    loading: loadingCustomMmr,
    updateSetting: updateCustomMmr,
  } = useUpdateSetting(DBSettings.customMmr)

  let onChangeMmr = useDebouncedCallback((e) => {
    updateCustomMmr(e.target.value ? e.target.value : defaultSettings.customMmr)
  }, 350)

  return (
    <Accordion.Item value={id}>
      <Card className="p-0">
        <Accordion.Control>
          <div className="title command">
            <div className="flex justify-between">
              <div className="flex space-x-2">
                <h3>{command.title}</h3>
                <div className="space-x-2">
                  {command.allowed === 'mods' && (
                    <>
                      <Badge
                        type="success"
                        className="!bg-green-800"
                        scale={0.5}
                      >
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
                <Switch disabled size="lg" className="flex" color="blue" />
              )}
              {!loading && command.key && (
                <Switch
                  size="lg"
                  color="blue"
                  defaultChecked={isEnabled}
                  onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
                >
                  !mmr
                </Switch>
              )}
            </div>
          </div>
          <div className="subtitle">{command.description}</div>
          <Accordion.Panel>
            {command.key === DBSettings['mmr-tracker'] && (
              <div className="py-4">
                <p className="ml-1 pb-1">
                  Custom message. Variables: [currentmmr] [currentrank]
                  [nextmmr] [wins]
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
          </Accordion.Panel>
        </Accordion.Control>
      </Card>
    </Accordion.Item>
  )
}
