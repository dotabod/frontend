import Image from 'next/image'
import { Input } from '@/components/Input'
import {
  useUpdateAccount,
  useUpdateSetting,
} from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Display, Link } from '@geist-ui/core'
import { Badge, Button, clsx, Switch, Tooltip } from '@mantine/core'
import { useForm } from '@mantine/form'
import { SteamAccount } from '@prisma/client'
import { useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Settings } from '@/lib/defaultSettings'
import { TrashIcon } from '@heroicons/react/24/outline'

import { transition } from '@/ui/utils'

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
    data: isEnabled,
    loading: l0,
    updateSetting,
  } = useUpdateSetting(Settings['mmr-tracker'])

  const {
    data: mmr,
    updateSetting: updateMmr,
    loading: l1,
  } = useUpdateSetting(Settings.mmr)

  const {
    data: onlyParty,
    loading: l2,
    updateSetting: updateOnlyParty,
  } = useUpdateSetting(Settings.onlyParty)

  const loading = l0 || l1 || l2

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
        Give or take {onlyParty ? 20 : 30} MMR after every ranked match.
      </div>
      <div>A list of accounts will show below as you play on them.</div>
      {accounts?.length !== 0 ? (
        <div className={clsx(!isEnabled && 'opacity-40', 'transition-all')}>
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
            {accounts.map((account, index) => {
              const removed =
                form.isDirty() &&
                form.values.accounts.findIndex(
                  (act) => act.steam32Id === account.steam32Id
                ) === -1
              return (
                <div
                  key={account.steam32Id}
                  className={clsx(removed && 'opacity-40')}
                >
                  <div className="mb-1 flex items-center space-x-1 text-dark-400">
                    <label
                      htmlFor={`${account.steam32Id}-mmr`}
                      className="cursor-pointer text-sm font-medium"
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

                  <div className="flex items-center space-x-2">
                    <Input
                      disabled={removed}
                      id={`${account.steam32Id}-mmr`}
                      placeholder="1234"
                      type="number"
                      min={0}
                      max={30000}
                      className="w-full"
                      {...form.getInputProps(`accounts.${index}.mmr`)}
                    />
                    <Button
                      disabled={removed}
                      onClick={() => {
                        form.setValues({
                          accounts: form.values.accounts.filter(
                            (act) => act.steam32Id !== account.steam32Id
                          ),
                        })
                      }}
                      leftIcon={<TrashIcon width={14} />}
                      color="red"
                      className="font-normal"
                      variant="subtle"
                      size="xs"
                    >
                      Remove account
                    </Button>
                  </div>
                </div>
              )
            })}
            {form.isDirty() && (
              <div
                key="motion-save-fields"
                {...transition}
                className={clsx('space-x-4')}
              >
                <Button
                  variant="outline"
                  color="green"
                  disabled={!form.isDirty()}
                  loading={loadingAccounts}
                  className={clsx(
                    'border-blue-500 bg-blue-600 text-dark-200 transition-colors hover:bg-blue-500',
                    form.isDirty() &&
                      accounts.length - form.values.accounts.length > 0 &&
                      'border-red-700 bg-red-700 hover:bg-red-600'
                  )}
                  type="submit"
                >
                  <span className="space-x-1">
                    {form.isDirty() &&
                    accounts.length - form.values.accounts.length > 0 ? (
                      <span>
                        Confirm remove{' '}
                        {accounts.length - form.values.accounts.length}
                      </span>
                    ) : accounts.length ? (
                      <span>Save</span>
                    ) : null}
                    <span>
                      account
                      {accounts.length - form.values.accounts.length > 1
                        ? 's'
                        : ''}
                    </span>
                  </span>
                </Button>
                <Button
                  disabled={!form.isDirty()}
                  onClick={() => {
                    form.setValues({ accounts })
                  }}
                  className="text-dark-300 transition-colors disabled:bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </div>
      ) : null}

      {accounts.length === 0 && (
        <div className="mt-6">
          <div className="mb-4">
            <Badge>INFO</Badge>
            <span>
              Play a bot game for Dotabod to detect your Steam account!
            </span>
          </div>
          <div className={clsx(!isEnabled && 'opacity-40', 'transition-all')}>
            <label
              htmlFor="mmr"
              className="mb-2 flex items-start justify-start text-sm font-medium text-dark-400 "
            >
              Current MMR
            </label>
            <div className="flex space-x-4">
              {loading && (
                <Input placeholder="Loading..." className="w-full" disabled />
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
        </div>
      )}

      {l2 && (
        <div className="mt-5 flex items-center space-x-2">
          <Switch size="sm" disabled color="blue" />
          <span>Party queue only</span>
        </div>
      )}
      {!l2 && (
        <Tooltip
          width={300}
          multiline
          label="Enable this to award 20 MMR instead of 30 for all matches. Disable to use 30 MMR again."
        >
          <div
            className={clsx(
              !isEnabled && 'opacity-40',
              'mt-5 flex w-fit items-center space-x-2 transition-all'
            )}
          >
            <Switch
              size="sm"
              onChange={(e) => updateOnlyParty(!!e?.currentTarget?.checked)}
              color="blue"
              defaultChecked={onlyParty}
            />
            <span>Party queue only</span>
          </div>
        </Tooltip>
      )}

      <div className={clsx(!isEnabled && 'opacity-40', 'transition-all')}>
        <Display
          shadow
          caption="Correct badge and MMR shown next to shop button"
        >
          <Image
            alt="mmr tracker"
            width={534}
            height={82}
            src="/images/dashboard/mmr-tracker.png"
          />
        </Display>
      </div>
    </Card>
  )
}
