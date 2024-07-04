import CommandDetail from '@/components/Dashboard/CommandDetail'
import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import Header from '@/components/Dashboard/Header'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { useGetSettingsByUsername } from '@/lib/hooks/useUpdateSetting'
import { getValueOrDefault } from '@/lib/settings'
import { Empty, Input, Segmented } from 'antd'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect, useState } from 'react'

const CommandsPage = () => {
  const [permission, setPermission] = useState('All')
  const [enabled, setEnabled] = useState('All')
  const { data, username, loading } = useGetSettingsByUsername()

  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (data?.error) {
      router.push('/404')
    }
  }, [data, router])

  const commands = Object.keys(CommandDetail).map((command) => {
    const isEnabled = getValueOrDefault(
      CommandDetail[command].key,
      data?.settings
    )
    return { command, isEnabled: !!isEnabled }
  })

  const filteredCommands = Object.keys(CommandDetail)
    .filter((command) => {
      const isEnabled = getValueOrDefault(
        CommandDetail[command].key,
        data?.settings
      )
      if (enabled === 'Enabled' && CommandDetail[command].key) {
        return isEnabled === true
      }
      if (enabled === 'Disabled') {
        return isEnabled === false
      }
      return true
    })
    .filter((command) => {
      if (permission === 'Mods') {
        return CommandDetail[command].allowed === 'mods'
      }
      if (permission === 'Plebs') {
        return CommandDetail[command].allowed === 'all'
      }
      return true
    })
    .filter((command) => {
      let containsStringValue = false
      ;['alias', 'title', 'description', 'cmd'].forEach((key) => {
        if (Array.isArray(CommandDetail[command][key])) {
          CommandDetail[command][key].forEach((alias) => {
            if (
              alias.toLowerCase().includes(searchTerm) ||
              `!${alias.toLowerCase()}`.includes(searchTerm)
            ) {
              containsStringValue = true
            }
          })
        } else if (
          CommandDetail[command][key].toLowerCase().includes(searchTerm)
        ) {
          containsStringValue = true
        }
      })

      return !(searchTerm && !containsStringValue)
    })

  if (data?.error) {
    // Show the default nextjs 404 page
    return null
  }

  return (
    <>
      <Head>
        <title>{`Commands for ${loading || !username ? '...' : username} - Dotabod`}</title>
        <meta
          name="description"
          content="An exhaustive list of all commands available using Twitch chat."
        />
      </Head>
      <div className="p-6">
        <Header
          subtitle="An exhaustive list of all commands available using Twitch chat."
          title={`Commands for ${loading || !username ? '...' : username}`}
        />

        <div className="flex items-baseline space-x-6 pb-6">
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
            placeholder="Search commands..."
            value={searchTerm}
            style={{ width: 300 }}
            onChange={(e) => setSearchTerm(`${e.target.value?.toLowerCase()}`)}
          />
        </div>
        {filteredCommands.length < 1 && (
          <Empty
            description="Could not find any matching commands."
            imageStyle={{ height: 60 }}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredCommands.map((key, i) => (
            <CommandsCard
              readonly
              key={i}
              id={key}
              publicLoading={loading}
              publicIsEnabled={
                commands.find((c) => c.command === key)?.isEnabled
              }
              command={CommandDetail[key]}
            />
          ))}
        </div>
      </div>
    </>
  )
}

CommandsPage.getLayout = function getLayout(page: ReactElement) {
  const { username } = useRouter().query
  return (
    <HomepageShell
      title={`Commands for ${!username ? '...' : username} - Dotabod`}
    >
      {page}
    </HomepageShell>
  )
}

export default CommandsPage
