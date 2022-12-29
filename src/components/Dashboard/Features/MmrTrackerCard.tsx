import { Input } from '@/components/Input'
import { DBSettings } from '@/lib/DBSettings'
import { useUpdateAccount, useUpdateSetting } from '@/lib/useUpdateSetting'
import { Card } from '@/ui/card'
import { Display, Image, Link, Loading } from '@geist-ui/core'
import { Badge, Button, clsx, Switch } from '@mantine/core'
import { useForm } from '@mantine/form'
import { SteamAccount } from '@prisma/client'
import { XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'

export default function MmrTrackerCard() {
  const { data, loading: loadingAccounts, update } = useUpdateAccount()
  const accounts = (data?.accounts || []) as SteamAccount[]

  const form = useForm({ initialValues: { accounts } })

  useEffect(() => {
    if (accounts.length && !loadingAccounts) {
      form.setValues({ accounts })
      form.resetDirty({ accounts })
    }
  }, [loadingAccounts])

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
        {l0 && <Switch disabled size="lg" color="blue" />}
        {!l0 && (
          <Switch
            size="lg"
            onChange={(e) => updateSetting(!!e?.currentTarget?.checked)}
            color="blue"
            defaultChecked={isEnabled}
          />
        )}
      </div>
      <div className="subtitle">
        Give or take 30 MMR after every ranked match.
      </div>
      <div>A list of accounts will show below as you play on them.</div>
      {accounts?.length ? (
        <form
          onSubmit={form.onSubmit((values) => {
            update(
              values.accounts.map((act) => ({
                ...act,
                mmr: Number(act.mmr) || 0,
              }))
            )
            form.resetDirty()
          })}
          className="mt-6 space-y-2"
        >
          {form.values.accounts.map((account, index) => (
            <div key={account.steam32Id}>
              <div className="mb-1 space-x-1">
                <label
                  htmlFor={`${account.steam32Id}-mmr`}
                  className="cursor-pointer text-sm font-medium text-dark-400 "
                >
                  <span>MMR for</span>
                </label>
                <Link
                  color
                  target="_blank"
                  href={`https://steamid.xyz/${account.steam32Id}`}
                  rel="noreferrer"
                >
                  {account.name}
                </Link>
              </div>
              <div className="flex items-center">
                <div className="w-full">
                  <Input
                    id={`${account.steam32Id}-mmr`}
                    placeholder="Your MMR?"
                    type="number"
                    min={0}
                    max={30000}
                    {...form.getInputProps(`accounts.${index}.mmr`)}
                  />
                </div>
                <Button
                  variant="outline"
                  color="red"
                  size="xs"
                  className="h-full w-fit border-transparent bg-transparent py-2 text-dark-200 transition-colors hover:bg-transparent hover:text-red-600"
                  onClick={() => {
                    form.setValues({
                      accounts: form.values.accounts.filter(
                        (act) => act.steam32Id !== account.steam32Id
                      ),
                    })
                  }}
                >
                  <XCircle size={24} />
                </Button>
              </div>
            </div>
          ))}
          <div className="space-x-4">
            <Button
              variant="outline"
              color="green"
              disabled={!form.isDirty()}
              loading={loadingAccounts}
              className={clsx(
                ' border-blue-500 bg-blue-600 text-dark-200 transition-colors hover:bg-blue-500',
                accounts.length - form.values.accounts.length > 0 &&
                  'border-red-700 bg-red-700 hover:bg-red-600'
              )}
              type="submit"
            >
              <span className="space-x-1">
                {accounts.length - form.values.accounts.length > 0 ? (
                  <span>
                    Confirm remove{' '}
                    {accounts.length - form.values.accounts.length}
                  </span>
                ) : null}
                {form.values.accounts.length ? <span>Save</span> : null}
                <span>
                  account
                  {form.values.accounts.length > 1 ? 's' : ''}
                </span>
              </span>
            </Button>
            <Button
              disabled={!form.isDirty()}
              onClick={() => {
                form.setValues({ accounts })
              }}
              className=" hov text-dark-200 transition-colors"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {accounts.length === 0 && (
        <div className="mt-6">
          <div className="mb-4">
            <Badge>INFO</Badge>
            <span>
              Play a bot game for Dotabod to detect your Steam account!
            </span>
          </div>
          <label
            htmlFor="mmr"
            className="mb-2 flex items-start justify-start text-sm font-medium text-dark-400 "
          >
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
                placeholder="0"
                className="w-full"
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
