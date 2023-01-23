import { Input } from '@/components/Input'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import { Card } from '@/ui/card'
import { Badge } from '@geist-ui/core'
import { Accordion, Switch } from '@mantine/core'
import { useDebouncedCallback } from 'use-debounce'
import { defaultSettings, Settings } from '@/lib/defaultSettings'

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
  } = useUpdateSetting(Settings.customMmr)

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
                      <Badge scale={0.5}>All</Badge>
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
            {command.key === Settings['mmr-tracker'] && (
              <div className="py-4">
                <p className="ml-1 pb-1">
                  Custom message. Variables: [currentmmr] [currentrank]
                  [nextmmr] [wins]
                </p>
                {loadingCustomMmr && (
                  <Input disabled placeholder="Loading..." type="text" />
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
            <div className="py-1">
              <p className="ml-1 pb-1">Command</p>
              <div className="flex flex-wrap">
                <div className="mr-2 mb-2">
                  <Badge>{command.cmd}</Badge>
                </div>
              </div>
            </div>
            {command.alias && command.alias.length ? (
              <div className="py-1">
                <p className="ml-1 pb-1">Alias</p>
                <div className="flex flex-wrap">
                  {command.alias.map((alias) => (
                    <div key={`${alias}`} className="mr-2 mb-2">
                      <Badge>!{alias}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Accordion.Panel>
        </Accordion.Control>
      </Card>
    </Accordion.Item>
  )
}
