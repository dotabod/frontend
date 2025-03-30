import DashboardShell from '@/components/Dashboard/DashboardShell'
import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import Header from '@/components/Dashboard/Header'
import { useUpdate } from '@/lib/hooks/useUpdateSetting'
import { getValueOrDefault } from '@/lib/settings'
import { Empty, Input, Segmented } from 'antd'
import Head from 'next/head'
import { type ReactElement, useState } from 'react'
import CommandDetail from '../../components/Dashboard/CommandDetail'

const CommandsPage = () => {
  const [permission, setPermission] = useState('All')
  const [enabled, setEnabled] = useState('All')
  const { data } = useUpdate({ path: '/api/settings' })

  const [searchTerm, setSearchTerm] = useState('')

  const filteredCommands = Object.keys(CommandDetail)
    .filter((command) => {
      const isEnabled = getValueOrDefault(CommandDetail[command].key, data?.settings)
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
      if (!searchTerm) return true

      const searchableKeys = ['alias', 'title', 'description', 'cmd']

      for (const key of searchableKeys) {
        const value = CommandDetail[command][key] || ''

        if (Array.isArray(value)) {
          for (const alias of value) {
            if (
              alias.toLowerCase().includes(searchTerm) ||
              `!${alias.toLowerCase()}`.includes(searchTerm)
            ) {
              return true
            }
          }
        } else if (value.toLowerCase().includes(searchTerm)) {
          return true
        }
      }

      return false
    })

  return (
    <>
      <Head>
        <title>Dotabod | Commands</title>
      </Head>
      <Header
        subtitle='An exhaustive list of all commands available using Twitch chat.'
        title='Commands'
      />

      <div className='flex items-baseline sm:gap-x-6 gap-y-2 max-w-full flex-wrap'>
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
          style={{ width: 300 }}
          maxLength={200}
          onChange={(e) => setSearchTerm(`${e.target.value?.toLowerCase()}`)}
        />
      </div>
      {filteredCommands.length < 1 && (
        <Empty description='Could not find any matching commands.' imageStyle={{ height: 60 }} />
      )}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3'>
        {filteredCommands.map((key) => (
          <CommandsCard key={key} id={key} command={CommandDetail[key]} />
        ))}
      </div>
    </>
  )
}

CommandsPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Commands | Dotabod Dashboard',
        description: 'Manage your Dotabod chat commands for your Dota 2 stream.',
        canonicalUrl: 'https://dotabod.com/dashboard/commands',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export default CommandsPage
