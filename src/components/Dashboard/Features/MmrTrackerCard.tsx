import { Card } from '@/ui/card'
import { Button, Display, Image, Link, Loading } from '@geist-ui/core'
import { useUpdateAccount, useUpdateSetting } from '@/lib/useUpdateSetting'
import { DBSettings } from '@/lib/DBSettings'
import { SteamAccount } from '@prisma/client'
import { useForm } from '@mantine/form'
import { useEffect } from 'react'
import { Badge, Switch } from '@mantine/core'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/Input'

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
      <div className="title">
        <h3>MMR tracker</h3>
        {l0 && <Switch disabled size="lg" color="indigo" />}
        {!l0 && (
          <Switch
            size="lg"
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            color="indigo"
            defaultChecked={isEnabled}
          />
        )}
      </div>
      <div className="subtitle">Let your chatters bet on your matches.</div>
      <div>Automatically goes up or down 30 MMR every ranked match.</div>
      <div className="my-6 space-x-2 text-xs">
        <Badge variant="filled">New</Badge>
        <span>
          Multi account support enabled. Play on your smurf or main to track MMR
          separately! A list of accounts will show below as you play on them.
        </span>
      </div>
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
              <div
                key={account.steam32Id}
                className="grid grid-cols-1 gap-2 md:grid-cols-1 lg:grid-cols-2"
              >
                <div>
                  <label className="mb-2 text-sm font-medium text-dark-400 ">
                    <span className="mr-2">Display name for</span>
                    <Link
                      color
                      target="_blank"
                      href={`https://steamid.xyz/${account.steam32Id}`}
                      rel="noreferrer"
                    >
                      {account.steam32Id}
                    </Link>
                  </label>
                  <Input
                    placeholder="Name"
                    style={{ width: 208 }}
                    type="text"
                    {...form.getInputProps(`accounts.${index}.name`)}
                  />
                </div>

                <div>
                  <label className="mt-2 mb-2 text-sm font-medium text-dark-400 ">
                    Your current MMR (required)
                  </label>

                  <Input
                    placeholder="Your MMR?"
                    type="number"
                    className="w-24"
                    min={0}
                    max={30000}
                    {...form.getInputProps(`accounts.${index}.mmr`)}
                  />
                </div>
              </div>
            )
          })}
          <Button loading={loadingAccounts} auto htmlType="submit">
            Save
          </Button>
        </form>
      ) : null}

      {accounts.length === 0 && (
        <div className="mt-6">
          <label
            htmlFor="mmr"
            className="mb-2 flex items-start justify-start text-sm font-medium text-dark-400 "
          >
            Your current MMR (required)
          </label>
          <div className="flex space-x-4">
            {loading && (
              <div className="w-52 rounded-md border border-gray-200 pt-2">
                <Loading className="left-0" />
              </div>
            )}
            {!loading && (
              <Input
                placeholder="0"
                id="mmr"
                name="mmr"
                type="number"
                min={0}
                max={30000}
                defaultValue={mmr}
                onChange={debouncedMmr}
              />
            )}
          </div>
        </div>
      )}

      <Display shadow caption="Correct badge and MMR shown next to shop button">
        <Image
          alt="mmr tracker"
          width="255px"
          height="233px"
          src="/images/mmr-tracker.png"
        />
      </Display>
    </Card>
  )
}
