import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useForm } from '@mantine/form'
import type { SteamAccount } from '@prisma/client'
import { Alert, Button, Form, InputNumber } from 'antd'
import clsx from 'clsx'
import { ExternalLinkIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useDebouncedCallback } from 'use-debounce'
import { AccessibleEmoji } from '@/components/AccessibleEmoji'
import { Input } from '@/components/Input'
import { MMRBadge } from '@/components/Overlay/rank/MMRBadge'
import { Settings } from '@/lib/defaultSettings'
import { fetcher } from '@/lib/fetcher'
import {
  SETTINGS_SWR_OPTIONS,
  STABLE_SWR_OPTIONS,
  useUpdateAccount,
  useUpdateSetting,
} from '@/lib/hooks/useUpdateSetting'
import { getRankDetail, getRankImage, type RankType } from '@/lib/ranks'

// Add type for form values
interface FormValues {
  accounts: Array<{
    steam32Id: number
    mmr: number
    name: string | null
    leaderboard_rank: number | null
    connectedUserIds: string[]
    delete?: boolean
  }>
}

const SteamAvatar = ({ data: response, id }) => {
  if (!response) return <p>Loading...</p>
  return (
    <Image
      width={45}
      height={45}
      className='rounded-sm'
      src={
        response?.data?.find((d) => `${d.id}` === `${id}`)?.avatar ||
        'https://avatars.cloudflare.steamstatic.com/fe7c264f9d2b435dfc2c4e099e3a5fc0ab71f492.jpg'
      }
      alt='Steam avatar'
    />
  )
}

const EmptyAccountsState = ({ hideText }: { hideText: boolean }) => {
  const { data } = useSWR('/api/settings', fetcher, SETTINGS_SWR_OPTIONS)
  const isLive = data?.stream_online

  return (
    <div className={clsx('mb-4', hideText && 'hidden')}>
      <Alert
        type='info'
        showIcon
        message='No Steam account detected yet'
        description={
          <div>
            <p className='mb-3'>
              <strong>To connect your Steam account:</strong>
            </p>
            <ol className='mb-3 list-inside list-decimal space-y-2'>
              <li>
                <strong>Run the setup</strong> - Go to{' '}
                <Link href='/dashboard?step=2' className='underline'>
                  Dashboard Setup (Step 2)
                </Link>{' '}
                and run the PowerShell script
              </li>
              <li>
                <strong>Start streaming</strong> - Your Twitch stream must be online{' '}
                {isLive ? (
                  <span className='inline-flex items-center gap-1 text-green-500'>
                    <AccessibleEmoji emoji='✅' label='Online' />
                    (currently online)
                  </span>
                ) : (
                  <span className='inline-flex items-center gap-1 text-red-500'>
                    <AccessibleEmoji emoji='❌' label='Offline' />
                    (currently offline)
                  </span>
                )}
              </li>
              <li>
                <strong>Play Dota 2</strong> - Play any match or demo a hero (2-minute test)
              </li>
              <li>
                <strong>Account appears here</strong> - Your Steam account will show automatically
              </li>
            </ol>
            <p className='mb-3 text-sm text-gray-400'>
              💡 After this first connection, all future matches and Steam accounts auto-connect
              forever!
            </p>
            <div className='flex flex-wrap gap-2'>
              <Link href='/dashboard?step=2'>
                <Button size='small' type='primary'>
                  Go to Setup
                </Button>
              </Link>
              <Link href='steam://run/570'>
                <Button size='small'>Launch Dota 2</Button>
              </Link>
              <Link href='/dashboard/help'>
                <Button size='small'>View Help</Button>
              </Link>
            </div>
          </div>
        }
      />
    </div>
  )
}

const MmrForm = ({ hideText = false }) => {
  const { data, loading: loadingAccounts, update } = useUpdateAccount()
  const [accounts, setAccounts] = useState<SteamAccount[]>([])
  const form = useForm<FormValues>({
    initialValues: {
      accounts: [],
    },
  })

  const steamIds = accounts.map((a) => a.steam32Id)
  const path = `/api/steam/${steamIds.join('/')}`
  const { data: steamData } = useSWR(steamIds.length ? path : null, fetcher, STABLE_SWR_OPTIONS)

  useEffect(() => {
    if (data?.accounts) {
      setAccounts(data.accounts)
      form.setValues({ accounts: data.accounts })
      form.resetDirty({ accounts: data.accounts })
    }
  }, [data, form.setValues, form.resetDirty])

  const {
    data: mmr,
    updateSetting: updateMmr,
    loading: l1,
  } = useUpdateSetting<number>(Settings.mmr)

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
                })),
              )
              form.resetDirty()
            })}
            className='mt-6 flex flex-col gap-2'
          >
            {form.values.accounts.map((account, index) => {
              const rankResponse = getRankDetail(account.mmr, account.leaderboard_rank)
              const rank = getRankImage(rankResponse as RankType)

              const multiUsedBy = account.connectedUserIds?.length
                ? account.connectedUserIds[0]
                : false

              const removed =
                form.isDirty() &&
                form.values.accounts.findIndex(
                  (act) => act.steam32Id === account.steam32Id && act.delete,
                ) !== -1
              return (
                <div key={account.steam32Id}>
                  <Form.Item
                    className={clsx(
                      'max-w-[327px]',
                      multiUsedBy && 'rounded-sm border border-solid border-yellow-500/40 p-4!',
                      removed && 'rounded-sm border border-dashed border-red-500/80 p-4!',
                    )}
                    help={
                      multiUsedBy && (
                        <p>
                          <ExclamationTriangleIcon className='mr-1 inline h-4 w-4 text-yellow-500' />
                          You will not be able to use this account until{' '}
                          <a
                            target='_blank'
                            href={`https://twitch.tv/${multiUsedBy}`}
                            rel='noreferrer'
                            className='mx-1 inline'
                          >
                            {multiUsedBy}
                            <ExternalLinkIcon className='inline ml-1 h-4 w-4' />
                          </a>
                          removes it from their dashboard. Or, join our{' '}
                          <Link href='/dashboard/help'>help page</Link> for support.
                        </p>
                      )
                    }
                  >
                    <div className='flex flex-col justify-center sm:items-start'>
                      <div
                        className={clsx(
                          'flex flex-col items-center sm:flex-row sm:items-start sm:justify-start sm:gap-2',
                          (removed || multiUsedBy) && 'opacity-40',
                        )}
                      >
                        <div className='h-12! w-12!'>
                          <MMRBadge
                            leaderboard={null}
                            image={rank?.image}
                            rank={null}
                            key={account.steam32Id}
                            className='rounded-md! bg-transparent p-0!'
                          />
                        </div>
                        <SteamAvatar id={account.steam32Id} data={steamData} />
                        <Form.Item
                          help={
                            <a
                              target='_blank'
                              href={`https://steamid.xyz/${account.steam32Id}`}
                              rel='noreferrer'
                              className='flex items-center gap-2'
                            >
                              <span className='max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap'>
                                {steamData?.name || account.name || 'Unknown steam name'}
                              </span>
                              <ExternalLinkIcon className='h-4 w-4' />
                            </a>
                          }
                        >
                          <InputNumber
                            disabled={Boolean(removed || multiUsedBy)}
                            id={`${account.steam32Id}-mmr`}
                            placeholder='9000'
                            type='number'
                            min={0}
                            max={30000}
                            className='w-[120px]!'
                            {...form.getInputProps(`accounts.${index}.mmr`)}
                          />
                        </Form.Item>

                        <Button
                          disabled={Boolean(removed || multiUsedBy)}
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
              <div className={clsx('gap-4')}>
                <Button
                  htmlType='submit'
                  type='primary'
                  disabled={!form.isDirty()}
                  loading={loadingAccounts}
                  danger={form.isDirty() && form.values.accounts.some((a) => a.delete)}
                >
                  <span className='gap-1'>
                    {form.isDirty() && form.values.accounts.some((a) => a.delete) ? (
                      <span>
                        Confirm remove {form.values.accounts.filter((a) => a.delete).length}
                      </span>
                    ) : accounts.length ? (
                      <span>Save</span>
                    ) : null}
                    <span>
                      account
                      {form.values.accounts.filter((a) => a.delete).length > 1 ? 's' : ''}
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
        <div className='mt-6'>
          <EmptyAccountsState hideText={hideText} />
          <div className='flex gap-4 transition-all'>
            <MMRBadge
              leaderboard={null}
              image={noSteamRank?.image}
              rank={null}
              className='bg-transparent'
            />
            <div className='flex flex-col'>
              {loading ? (
                <Input placeholder='Loading...' className='w-[200px]!' disabled />
              ) : (
                <InputNumber
                  placeholder='9000'
                  className='w-[200px]!'
                  id='mmr'
                  name='mmr'
                  type='number'
                  min={0}
                  max={30000}
                  defaultValue={mmr}
                  onChange={debouncedMmr}
                />
              )}
              <label htmlFor='mmr' className='mb-2 flex text-sm text-gray-400 '>
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
