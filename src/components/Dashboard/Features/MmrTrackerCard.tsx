import Image from 'next/image'
import { Input } from '@/components/Input'
import {
  useUpdateAccount,
  useUpdateSetting,
} from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Typography, Tag, Button, Switch, Tooltip } from 'antd'
import { useForm } from '@mantine/form'
import { SteamAccount } from '@prisma/client'
import React, { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Settings } from '@/lib/defaultSettings'
import { TrashIcon } from '@heroicons/react/24/outline'
import { fetcher } from '@/lib/fetcher'
import useSWR from 'swr'
import { MMRBadge } from '@/components/Overlay/rank/MMRBadge'
import { getRankDetail, getRankImage, RankType } from '@/lib/ranks'
import clsx from 'clsx'

const SteamAvatar = ({ data: response, id }) => {
  if (!response) return <p>Loading...</p>
  return (
    <Image
      width={45}
      height={45}
      className="rounded"
      src={
        response?.data?.find((d) => `${d.id}` === `${id}`)?.avatar ||
        'https://avatars.cloudflare.steamstatic.com/fe7c264f9d2b435dfc2c4e099e3a5fc0ab71f492.jpg'
      }
      alt="Steam avatar"
    />
  )
}

export default function MmrTrackerCard() {
  const { data, loading: loadingAccounts, update } = useUpdateAccount()
  const [accounts, setAccounts] = useState<SteamAccount[]>([])
  const form = useForm({
    initialValues: {
      accounts: [],
    },
  })

  const steamIds = accounts.map((a) => a.steam32Id)
  const path = `/api/steam/${steamIds.join('/')}`
  const { data: steamData } = useSWR(path, steamIds.length && fetcher)

  useEffect(() => {
    if (data?.accounts) {
      setAccounts(data?.accounts || [])
      form.setValues({ accounts: data?.accounts })
      form.resetDirty({ accounts: data?.accounts })
    }
  }, [data])

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

  const { data: showRankMmr, updateSetting: updateHideMmr } = useUpdateSetting(
    Settings.showRankMmr
  )

  const { data: showRankImage, updateSetting: updateHideRankImage } =
    useUpdateSetting(Settings.showRankImage)

  const { data: showRankLeader, updateSetting: updateHideRankLeader } =
    useUpdateSetting(Settings.showRankLeader)

  const loading = l0 || l1 || l2

  const debouncedMmr = useDebouncedCallback((e) => {
    updateMmr(Number(e.target.value))
  }, 500)

  const noSteamRankResponse = getRankDetail(mmr, null)
  const noSteamRank = getRankImage(noSteamRankResponse as RankType)

  return (
    <Card>
      <div className="title">
        <h3>MMR tracker</h3>
      </div>
      <div className="subtitle">
        Give or take {onlyParty ? 20 : 30} MMR after every ranked match.
      </div>
      <div>A list of accounts will show below as you play on them.</div>

      <div className={clsx('py-4 transition-all')}>
        <div className="flex flex-col items-start space-y-2 md:space-y-3">
          <div className="flex items-center space-x-2">
            <Switch checked={isEnabled} onChange={updateSetting} />
            <span>Update mmr with every match</span>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={showRankMmr} onChange={updateHideMmr} />
            <span>Show MMR</span>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={showRankLeader} onChange={updateHideRankLeader} />
            <span>Show leaderboard ranking</span>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={showRankImage} onChange={updateHideRankImage} />
            <span>Show rank badge</span>
          </div>

          <Tooltip
            placement="bottom"
            title="Enable this to award 20 MMR instead of 30 for all matches. Disable to use 30 MMR again."
          >
            <div
              className={clsx(
                'mt-5 flex w-fit items-center space-x-2 transition-all'
              )}
            >
              <div className="flex items-center space-x-2">
                <Switch checked={onlyParty} onChange={updateOnlyParty} />
                <span>Party queue only</span>
              </div>
            </div>
          </Tooltip>
        </div>
      </div>

      {form.values.accounts?.length !== 0 ? (
        <div className={clsx('transition-all')}>
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
            {form.values.accounts.map((account, index) => {
              const rankResponse = getRankDetail(
                account.mmr,
                account.leaderboard_rank
              )
              const rank = getRankImage(rankResponse as RankType)

              const removed =
                form.isDirty() &&
                form.values.accounts.findIndex(
                  (act) => act.steam32Id === account.steam32Id && act.delete
                ) !== -1
              return (
                <div
                  key={account.steam32Id}
                  className={clsx(removed && 'opacity-40')}
                >
                  <div className="mb-1 flex items-center space-x-1 text-dark-400">
                    <Typography.Link
                      target="_blank"
                      href={`https://steamid.xyz/${account.steam32Id}`}
                      rel="noreferrer"
                    >
                      {account.name}
                    </Typography.Link>
                  </div>

                  <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-x-2">
                    <MMRBadge
                      leaderboard={null}
                      image={rank?.image}
                      rank={null}
                      key={account.steam32Id}
                      className="self-center !rounded-md"
                    />
                    <SteamAvatar id={account.steam32Id} data={steamData} />
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
                      danger
                      onClick={() => {
                        form.setValues({
                          accounts: form.values.accounts.map((act) => {
                            if (act.steam32Id === account.steam32Id) {
                              return {
                                ...act,
                                delete: true,
                              }
                            }
                            return act
                          }),
                        })
                      }}
                    >
                      <TrashIcon height={16} />
                    </Button>
                  </div>
                </div>
              )
            })}
            {form.isDirty() && (
              <div className={clsx('space-x-4')}>
                <Button
                  htmlType="submit"
                  type="primary"
                  disabled={!form.isDirty()}
                  loading={loadingAccounts}
                  danger={
                    form.isDirty() && form.values.accounts.some((a) => a.delete)
                  }
                >
                  <span className="space-x-1">
                    {form.isDirty() &&
                    form.values.accounts.some((a) => a.delete) ? (
                      <span>
                        Confirm remove{' '}
                        {form.values.accounts.filter((a) => a.delete).length}
                      </span>
                    ) : accounts.length ? (
                      <span>Save</span>
                    ) : null}
                    <span>
                      account
                      {form.values.accounts.filter((a) => a.delete).length > 1
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
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </div>
      ) : null}

      {form.values.accounts.length === 0 && (
        <div className="mt-6">
          <div className="mb-4">
            <Tag>INFO</Tag>
            <span>
              Play a bot game for Dotabod to detect your Steam account!
            </span>
          </div>
          <div className="flex space-x-4 transition-all">
            <MMRBadge
              leaderboard={null}
              image={noSteamRank?.image}
              rank={null}
              className="h-12 w-12 !rounded-md"
            />
            <div className="flex flex-col">
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
              <label
                htmlFor="mmr"
                className="mb-2 flex text-sm font-medium text-dark-400 "
              >
                Enter your current MMR
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-center space-x-4">
        <MMRBadge
          leaderboard={null}
          image={showRankImage ? '11.png' : null}
          rank={showRankMmr ? '130' : null}
          className="self-center !rounded-md"
        />
        <MMRBadge
          leaderboard={showRankLeader ? '1' : null}
          image={showRankImage ? '92.png' : null}
          rank={showRankMmr ? '13150' : null}
          className="self-center !rounded-md"
        />
      </div>

      <div className={clsx('transition-all')}>
        <div className="flex flex-col items-center space-y-4">
          <Image
            alt="mmr tracker"
            width={534}
            height={82}
            src="/images/dashboard/mmr-tracker.png"
          />
          <span>Correct badge and MMR shown next to shop button</span>
        </div>
      </div>
    </Card>
  )
}
