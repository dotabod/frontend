import Image from 'next/image'
import { Input } from '@/components/Input'
import {
  useUpdateAccount,
  useUpdateSetting,
} from '@/lib/hooks/useUpdateSetting'
import { Tag, Button, InputNumber, Form } from 'antd'
import { useForm } from '@mantine/form'
import { SteamAccount } from '@prisma/client'
import React, { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Settings } from '@/lib/defaultSettings'
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { fetcher } from '@/lib/fetcher'
import useSWR from 'swr'
import { MMRBadge } from '@/components/Overlay/rank/MMRBadge'
import { getRankDetail, getRankImage, RankType } from '@/lib/ranks'
import clsx from 'clsx'
import { ExternalLinkIcon } from 'lucide-react'

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

const MmrForm = ({ hideText = false }) => {
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
    data: mmr,
    updateSetting: updateMmr,
    loading: l1,
  } = useUpdateSetting(Settings.mmr)

  const loading = l1

  const debouncedMmr = useDebouncedCallback((value) => {
    updateMmr(Number(value))
  }, 500)

  const noSteamRankResponse = getRankDetail(mmr, null)
  const noSteamRank = getRankImage(noSteamRankResponse as RankType)

  return (
    <>
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

              const multiUsedBy = !!account.connectedUserIds?.length
                ? account.connectedUserIds[0]
                : false

              const removed =
                form.isDirty() &&
                form.values.accounts.findIndex(
                  (act) => act.steam32Id === account.steam32Id && act.delete
                ) !== -1
              return (
                <div key={account.steam32Id}>
                  <Form.Item
                    className={clsx(
                      'max-w-[327px]',
                      multiUsedBy &&
                        'rounded border border-solid border-yellow-500/40 !p-4',
                      removed &&
                        'rounded border border-dashed border-red-500/80 !p-4'
                    )}
                    help={
                      multiUsedBy && (
                        <p>
                          <ExclamationTriangleIcon className="mr-1 inline h-4 w-4 text-yellow-500" />
                          You will not be able to use this account until{' '}
                          <a
                            target="_blank"
                            href={`https://twitch.tv/${multiUsedBy}`}
                            rel="noreferrer"
                            className="mx-1 inline"
                          >
                            {multiUsedBy}
                            <ExternalLinkIcon className="inline h-4 w-4" />
                          </a>
                          removes it from their dashboard.
                        </p>
                      )
                    }
                  >
                    <div className="flex flex-col justify-center sm:items-start">
                      <div
                        className={clsx(
                          'flex flex-col items-center sm:flex-row sm:items-start sm:justify-start sm:space-x-2',
                          (removed || multiUsedBy) && 'opacity-40'
                        )}
                      >
                        <div className="!h-12 !w-12">
                          <MMRBadge
                            leaderboard={null}
                            image={rank?.image}
                            rank={null}
                            key={account.steam32Id}
                            className="!rounded-md bg-transparent !p-0"
                          />
                        </div>
                        <SteamAvatar id={account.steam32Id} data={steamData} />
                        <Form.Item
                          help={
                            <a
                              target="_blank"
                              href={`https://steamid.xyz/${account.steam32Id}`}
                              rel="noreferrer"
                              className="flex items-center space-x-2"
                            >
                              <span className="max-w-[90px] overflow-hidden overflow-ellipsis whitespace-nowrap">
                                {account.name}
                              </span>
                              <ExternalLinkIcon className="h-4 w-4" />
                            </a>
                          }
                        >
                          <InputNumber
                            disabled={removed || multiUsedBy}
                            id={`${account.steam32Id}-mmr`}
                            placeholder="9000"
                            type="number"
                            min={0}
                            max={30000}
                            className="!w-[120px]"
                            {...form.getInputProps(`accounts.${index}.mmr`)}
                          />
                        </Form.Item>

                        <Button
                          disabled={removed || multiUsedBy}
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
                  </Form.Item>
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
          <div className={clsx('mb-4', hideText && 'hidden')}>
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
              className="bg-transparent"
            />
            <div className="flex flex-col">
              {loading &&
                !(
                  <Input
                    placeholder="Loading..."
                    className="!w-[200px]"
                    disabled
                  />
                )}
              {!loading && (
                <InputNumber
                  placeholder="9000"
                  className="!w-[200px]"
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
                className="mb-2 flex text-sm font-medium text-gray-400 "
              >
                Enter your current MMR
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MmrForm
