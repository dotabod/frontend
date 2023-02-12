import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { getValueOrDefault } from '@/lib/settings'
import { useUpdate } from '@/lib/hooks/useUpdateSetting'
import { Group, SegmentedControl, TextInput } from '@mantine/core'
import { useInputState, useLocalStorage } from '@mantine/hooks'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import { ReactElement } from 'react'
import CommandDetail from '../../components/Dashboard/CommandDetail'
import Header from '@/components/Dashboard/Header'
import { Empty } from 'antd'

const CommandsPage = () => {
  const { status } = useSession()
  const [permission, setPermission] = useLocalStorage({
    key: 'command-display-permission',
    defaultValue: 'All',
  })
  const [enabled, setEnabled] = useLocalStorage({
    key: 'command-display-enabled',
    defaultValue: 'All',
  })
  const { data } = useUpdate({ path: `/api/settings` })

  const [searchTerm, setSearchTerm] = useInputState('')

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

      <div className="flex justify-between">
        <Group className="mb-4">
          <SegmentedControl
            value={permission}
            onChange={setPermission}
            data={['All', 'Mods', 'Plebs']}
            color="blue"
          />
          <SegmentedControl
            value={enabled}
            onChange={setEnabled}
            data={['All', 'Enabled', 'Disabled']}
            color="blue"
          />
        </Group>
        <TextInput
          placeholder="Search commands..."
          value={searchTerm}
          onChange={setSearchTerm}
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
