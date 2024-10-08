import DashboardShell from '@/components/Dashboard/DashboardShell'
import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import Header from '@/components/Dashboard/Header'
import { useUpdate } from '@/lib/hooks/useUpdateSetting'
import { getValueOrDefault } from '@/lib/settings'
import { Empty, Input, Segmented } from 'antd'
import Head from 'next/head'
import { type ReactElement, useState } from 'react'
import CommandDetail from '../../components/Dashboard/CommandDetail'
import { useTranslation } from 'next-i18next'

const CommandsPage = () => {
  const { t } = useTranslation('common')
  const [permission, setPermission] = useState('All')
  const [enabled, setEnabled] = useState('All')
  const { data } = useUpdate({ path: '/api/settings' })

  const [searchTerm, setSearchTerm] = useState('')

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

  return (
    <>
      <Head>
        <title>Dotabod | {t('commands.title')}</title>
      </Head>
      <Header
        subtitle={t('commands.subtitle')}
        title={t('commands.title')}
      />

      <div className="flex items-baseline sm:space-x-6 space-y-2 max-w-full flex-wrap">
        <Segmented
          value={enabled}
          onChange={(v) => setEnabled(v as string)}
          options={[t('commands.all'), t('commands.enabled'), t('commands.disabled')]}
        />
        <Segmented
          value={permission}
          onChange={(v) => setPermission(v as string)}
          options={[t('commands.all'), t('commands.mods'), t('commands.plebs')]}
        />
        <Input
          placeholder={t('commands.searchPlaceholder')}
          value={searchTerm}
          style={{ width: 300 }}
          maxLength={200}
          onChange={(e) => setSearchTerm(`${e.target.value?.toLowerCase()}`)}
        />
      </div>
      {filteredCommands.length < 1 && (
        <Empty
          description={t('commands.noMatchingCommands')}
          imageStyle={{ height: 60 }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filteredCommands.map((key, i) => (
          <CommandsCard key={i} id={key} command={CommandDetail[key]} />
        ))}
      </div>
    </>
  )
}

CommandsPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default CommandsPage
