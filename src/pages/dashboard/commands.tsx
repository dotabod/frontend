import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { getValueOrDefault } from '@/lib/settings'
import { useUpdate } from '@/lib/hooks/useUpdateSetting'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import { ReactElement, useState } from 'react'
import CommandDetail from '../../components/Dashboard/CommandDetail'
import Header from '@/components/Dashboard/Header'
import { Empty, Input, Segmented } from 'antd'

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
            if (alias.toLowerCase().includes(searchTerm.toLowerCase())) {
              containsStringValue = true
            }
          })
        } else if (
          CommandDetail[command][key]
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
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
        subtitle="An exhaustive list of all commands available with the Dotabod chat bot."
        title="Commands"
      />

      <div className="flex items-baseline space-x-6">
        <div className="flex flex-col space-y-3">
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
        </div>
        <Input
          placeholder="Search commands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredCommands.length < 1 && (
        <Empty
          description="Could not find any matching commands."
          imageStyle={{ height: 60 }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
