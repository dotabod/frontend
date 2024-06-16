import DashboardShell from '@/components/Dashboard/DashboardShell'
import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import Header from '@/components/Dashboard/Header'
import { useUpdate } from '@/lib/hooks/useUpdateSetting'
import { getValueOrDefault } from '@/lib/settings'
import { Empty, Input, Segmented } from 'antd'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import { type ReactElement, useState } from 'react'
import CommandDetail from '../../components/Dashboard/CommandDetail'

const CommandsPage = () => {
  const { status } = useSession()
  const [permission, setPermission] = useState('All')
  const [enabled, setEnabled] = useState('All')
  const { data } = useUpdate({ path: `/api/settings` })

  const [searchTerm, setSearchTerm] = useState('')

  const filteredCommands = Object.keys(CommandDetail)
    .filter((command) => {
      const isEnabled = getValueOrDefault(
        CommandDetail[command].key,
        data?.settings
      )
      if (enabled === 'Enabled' && CommandDetail[command].key) {
        return isEnabled === true
      } else if (enabled === 'Disabled') {
        return isEnabled === false
      }
      return true
    })
    .filter((command) => {
      if (permission === 'Mods') {
        return CommandDetail[command].allowed === 'mods'
      } else if (permission === 'Plebs') {
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

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Commands</title>
      </Head>
      <Header
        subtitle="An exhaustive list of all commands available using Twitch chat."
        title="Commands"
      />

      <div className="flex items-baseline space-x-6">
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
          <CommandsCard key={i} id={key} command={CommandDetail[key]} />
        ))}
      </div>
    </>
  ) : null
}

CommandsPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default CommandsPage
