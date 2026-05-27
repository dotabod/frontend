import { Empty, Input, Segmented } from 'antd'
import Head from 'next/head'
import { type ReactElement, useState } from 'react'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import Header from '@/components/Dashboard/Header'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useUpdate } from '@/lib/hooks/useUpdateSetting'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import { getValueOrDefault } from '@/lib/settings'
import CommandDetail from '../../components/Dashboard/CommandDetail'

const commandKeys = Object.keys(CommandDetail) as (keyof typeof CommandDetail)[]

const CommandsPage = () => {
  const [permission, setPermission] = useState('All')
  const [enabled, setEnabled] = useState('All')
  const { data } = useUpdate({ path: '/api/settings' })
  const settings = data?.settings as { key: string; value: unknown }[] | undefined

  const [searchTerm, setSearchTerm] = useState('')

  const filteredCommands = commandKeys
    .filter((command) => {
      const commandDetail = CommandDetail[command]
      const isEnabled = getValueOrDefault(commandDetail.key, settings)
      if (enabled === 'Enabled' && commandDetail.key) {
        return isEnabled === true
      }
      if (enabled === 'Disabled') {
        return isEnabled === false
      }
      return true
    })
    .filter((command) => {
      const commandDetail = CommandDetail[command]
      if (permission === 'Mods') {
        return commandDetail.allowed === 'mods'
      }
      if (permission === 'Plebs') {
        return commandDetail.allowed === 'all'
      }
      return true
    })
    .filter((command) => {
      if (!searchTerm) {
        return true
      }

      const searchableKeys = ['alias', 'title', 'description', 'cmd']
      const commandDetail = CommandDetail[command]

      for (const key of searchableKeys) {
        const value = commandDetail[key as keyof typeof commandDetail] || ''

        if (Array.isArray(value)) {
          for (const alias of value) {
            if (
              alias.toLowerCase().includes(searchTerm) ||
              `!${alias.toLowerCase()}`.includes(searchTerm)
            ) {
              return true
            }
          }
        } else if (typeof value === 'string' && value.toLowerCase().includes(searchTerm)) {
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
      {filteredCommands.length === 0 && (
        <Empty description='Could not find any matching commands.' imageStyle={{ height: 60 }} />
      )}

      <ErrorBoundary>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3'>
          {filteredCommands.map((key) => (
            <CommandsCard key={key} id={key} command={CommandDetail[key]} />
          ))}
        </div>
      </ErrorBoundary>
    </>
  )
}

CommandsPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        canonicalUrl: 'https://dotabod.com/dashboard/commands',
        description: 'Manage your Dotabod chat commands for your Dota 2 stream.',
        noindex: true,
        title: 'Commands | Dotabod Dashboard',
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess()

export default CommandsPage
