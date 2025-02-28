import CommandDetail from '@/components/Dashboard/CommandDetail'
import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { useGetSettingsByUsername } from '@/lib/hooks/useUpdateSetting'
import { getValueOrDefault } from '@/lib/settings'
import type { NextPageWithLayout } from '@/pages/_app'
import { Empty, Input, Segmented, Spin } from 'antd'
import { ExternalLinkIcon } from 'lucide-react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect, useState } from 'react'

const CommandsPage: NextPageWithLayout = () => {
  const [permission, setPermission] = useState('All')
  const [enabled, setEnabled] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const { username } = router.query
  const { data, loading, error, notFound } = useGetSettingsByUsername()

  useEffect(() => {
    // Only redirect to 404 if username exists in query and we've finished loading
    if (username && !loading && (notFound || data?.error || error)) {
      router.push('/404')
    }
  }, [data, loading, router, notFound, error, username])

  if (loading || error || !data) {
    return (
      <div className='p-6 flex justify-center items-center min-h-screen'>
        <Spin size='large' tip='Loading user data...' />
      </div>
    )
  }

  const commands = data?.settings
    ? Object.keys(CommandDetail).map((command) => {
        const isEnabled = getValueOrDefault(CommandDetail[command].key, data?.settings)
        return { command, isEnabled: !!isEnabled }
      })
    : []

  const filteredCommands = Object.keys(CommandDetail)
    .filter((command) => {
      const isEnabled = getValueOrDefault(CommandDetail[command].key, data?.settings)
      if (enabled === 'Enabled') return isEnabled === true
      if (enabled === 'Disabled') return isEnabled === false
      return true
    })
    .filter((command) => {
      if (permission === 'Mods') return CommandDetail[command].allowed === 'mods'
      if (permission === 'Plebs') return CommandDetail[command].allowed === 'all'
      return true
    })
    .filter((command) => {
      const keysToSearch = ['alias', 'title', 'description', 'cmd']
      return keysToSearch.some((key) => {
        const value = CommandDetail[command][key]
        if (Array.isArray(value)) {
          return value.some(
            (alias) =>
              alias.toLowerCase().includes(searchTerm) ||
              `!${alias.toLowerCase()}`.includes(searchTerm),
          )
        }
        return value.toLowerCase().includes(searchTerm)
      })
    })

  return (
    <>
      <Head>
        <title>{`Commands for ${loading || !data?.displayName ? '...' : data.displayName} - Dotabod`}</title>
        <meta
          name='description'
          content='An exhaustive list of all commands available using Twitch chat.'
        />
        {username && typeof username === 'string' && (
          <link rel='canonical' href={`https://dotabod.com/${username}`} />
        )}
        <meta
          name='robots'
          content={username === '[username]' ? 'noindex, nofollow' : 'index, follow'}
        />
      </Head>
      <div className='p-6'>
        <div className='mb-12 space-y-4'>
          <div className='flex flex-row items-center space-x-2'>
            <Image
              onError={(e) => {
                e.currentTarget.src = '/images/hero/default.png'
              }}
              src={data?.image || '/images/hero/default.png'}
              alt='Profile Picture'
              width={80}
              height={80}
              className='rounded-full flex'
            />
            <div>
              <div className='flex flex-row items-center space-x-4'>
                <Link
                  target='_blank'
                  href={!loading && data ? `https://twitch.tv/${data?.name}` : ''}
                  passHref
                  className='flex flex-row items-center space-x-2'
                >
                  <h1 className='text-2xl font-bold leading-6'>
                    {loading || !data?.displayName ? 'Loading...' : data.displayName}
                  </h1>
                  <ExternalLinkIcon className='flex' size={15} />
                </Link>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs ${data?.stream_online ? 'bg-red-700' : 'bg-gray-700'}`}
                >
                  {data?.stream_online ? 'Live' : 'Offline'}
                </span>
              </div>
              <span>
                Using Dotabod since{' '}
                {loading || !data?.createdAt
                  ? '...'
                  : new Date(data.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className='text-gray-300'>
            All commands available to use in Twitch chat with Dotabod.
          </div>
        </div>
        <div className='flex items-baseline sm:space-x-6 space-y-2 max-w-full flex-wrap mb-4'>
          <Segmented
            value={enabled}
            onChange={(v) => setEnabled(v as string)}
            options={['All', 'Enabled', 'Disabled']}
          />
          <Segmented
            value={permission}
            onChange={(v) => setPermission(v as string)}
            options={['All', 'Mods', 'Plebs']}
          />
          <Input
            placeholder='Search commands...'
            value={searchTerm}
            maxLength={200}
            style={{ width: 300 }}
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          />
        </div>
        {filteredCommands.length < 1 && (
          <Empty description='Could not find any matching commands.' imageStyle={{ height: 60 }} />
        )}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 mb-10'>
          {filteredCommands.map((key) => (
            <CommandsCard
              readonly
              key={key}
              id={key}
              publicLoading={loading}
              publicIsEnabled={commands.find((c) => c.command === key)?.isEnabled}
              command={CommandDetail[key]}
            />
          ))}
        </div>
      </div>
    </>
  )
}

CommandsPage.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell dontUseTitle>{page}</HomepageShell>
}

export default CommandsPage
