import { Card } from '@/ui/card'
import { Button, Display, Image, Input, Link, Loading } from '@geist-ui/core'
import { useUpdateAccount, useUpdateSetting } from '@/lib/useUpdateSetting'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline'
import { DBSettings } from '@/lib/DBSettings'
import { SteamAccount } from '@prisma/client'
import { useForm } from '@mantine/form'
import { useEffect } from 'react'
import { Badge } from '@mantine/core'
import { useDebouncedCallback } from 'use-debounce'

export default function MmrTrackerCard() {
  const { data, loading: loadingAccounts, update } = useUpdateAccount()
  const accounts = (data?.accounts || []) as SteamAccount[]

  const form = useForm({ initialValues: { accounts } })

  useEffect(() => {
    if (accounts.length && !loadingAccounts) {
      form.setValues({ accounts })
    }
  }, [accounts, loadingAccounts])

  const {
    isEnabled,
    loading: l0,
    updateSetting,
  } = useUpdateSetting(DBSettings.mmrTracker)
  const {
    isEnabled: mmr,
    updateSetting: updateMmr,
    loading: l1,
  } = useUpdateSetting(DBSettings.mmr)
  const loading = l0 || l1

  const debouncedMmr = useDebouncedCallback((e) => {
    updateMmr(Number(e.target.value))
  }, 500)

  return (
    <Card>
      <Card.Header>
        <Card.Title>MMR Tracker</Card.Title>
        <Card.Description>
          <div>
            <div>
              Automatically goes up or down after every match. !mmr will work to
              show mmr to your chatters! If it ever gets out of sync, you can
              update it here.
            </div>
            <div className="mt-2 flex items-center space-x-2 text-xs">
              <Badge style={{ width: 100 }}>New</Badge>
              <span>
                Multi account support enabled. Play on your smurf or main to
                track MMR separately! A list of accounts will show below as you
                play on them.
              </span>
            </div>
          </div>
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {accounts?.length ? (
          <form
            onSubmit={form.onSubmit((values) => {
              update(
                values.accounts.map((act) => ({
                  ...act,
                  mmr: Number(act.mmr) || 0,
                }))
              )
            })}
            className="space-y-2"
          >
            {accounts.map((account, index) => {
              return (
                <div key={account.steam32Id} className="space-x-2">
                  <Input
                    placeholder="Name"
                    style={{ width: 208 }}
                    htmlType="text"
                    disabled={!isEnabled}
                    {...form.getInputProps(`accounts.${index}.name`)}
                  >
                    Display name for{' '}
                    <Link
                      color
                      target="_blank"
                      href={`https://steamid.xyz/${account.steam32Id}`}
                      rel="noreferrer"
                    >
                      {account.steam32Id}
                    </Link>
                  </Input>
                  <Input
                    placeholder="Enter MMR"
                    style={{ width: 108 }}
                    htmlType="number"
                    min={0}
                    max={30000}
                    disabled={!isEnabled}
                    {...form.getInputProps(`accounts.${index}.mmr`)}
                  >
                    MMR
                  </Input>
                </div>
              )
            })}
            <Button
              disabled={!isEnabled}
              loading={loadingAccounts}
              auto
              htmlType="submit"
            >
              Save
            </Button>
          </form>
        ) : null}

        {accounts.length === 0 && (
          <>
            <label htmlFor="mmr" className="block text-sm">
              Current MMR
            </label>
            <div className="flex space-x-4">
              {loading && (
                <div className="w-52 rounded-md border border-gray-200 pt-2">
                  <Loading className="left-0" />
                </div>
              )}
              {!loading && (
                <Input
                  placeholder="Enter MMR"
                  id="mmr"
                  name="mmr"
                  style={{ width: 208 }}
                  htmlType="number"
                  min={0}
                  max={30000}
                  initialValue={mmr}
                  disabled={!isEnabled}
                  onChange={debouncedMmr}
                />
              )}
            </div>
          </>
        )}

        <Display
          shadow
          caption="Correct badge and MMR shown next to shop button"
        >
          <Image
            alt="mmr tracker"
            width="255px"
            height="233px"
            src="/images/mmr-tracker.png"
          />
        </Display>
      </Card.Content>
      <Card.Footer>
        {loading ? (
          <Button disabled>loading...</Button>
        ) : (
          <Button
            icon={isEnabled ? <PauseIcon /> : <PlayIcon />}
            type="secondary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => updateSetting(!isEnabled)}
          >
            {isEnabled ? 'Disable' : 'Enable'}
          </Button>
        )}
      </Card.Footer>
    </Card>
  )
}
