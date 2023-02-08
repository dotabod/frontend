import { useState } from 'react'
import Link from 'next/link'
import {
  AppShell,
  Burger,
  MediaQuery,
  Navbar,
  Switch,
  useMantineTheme,
} from '@mantine/core'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import { navigation } from '@/components/Dashboard/navigation'
import clsx from 'clsx'
import { UserAccountNav } from '@/components/UserAccountNav'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import { DonationMenu } from '@/components/DonationMenu'
import { DarkLogo } from '@/components/Logo'

export default function DashboardShell({ children, title, subtitle }) {
  const theme = useMantineTheme()
  const [opened, setOpened] = useState(false)

  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(Settings.commandDisable)

  return (
    <>
      <style global jsx>{`
        html,
        body {
          @apply !bg-dark-700;
          scrollbar-width: thin;
          scrollbar-color: #3e4155 transparent;
        }
        .mantine-Navbar-root {
          scrollbar-width: thin;
          scrollbar-color: #3e4155 transparent;
        }
        ::-webkit-scrollbar {
          width: 6px;
          outline: none;
          border: none;
          background: transparent;
          padding: 3px;
        }

        ::-webkit-scrollbar-thumb {
          @apply bg-dark-500;
          border-radius: 6px;
        }

        ::-webkit-scrollbar-track {
          @apply bg-transparent/10;
          border-radius: 6px;
        }
      `}</style>
      <AppShell
        className="transition-all"
        styles={{
          main: {
            background:
              theme.colorScheme === 'dark'
                ? theme.colors.dark[7]
                : theme.colors.gray[0],
          },
        }}
        navbarOffsetBreakpoint="sm"
        asideOffsetBreakpoint="sm"
        navbar={
          <Navbar
            className="overflow-y-scroll transition-all"
            style={{
              background:
                theme.colorScheme === 'dark'
                  ? theme.colors.dark[8]
                  : theme.colors.gray[0],
            }}
            p="md"
            hiddenBreakpoint="sm"
            hidden={!opened}
            width={{ sm: 300, md: 400, lg: 500 }}
          >
            <div className="flex flex-col items-end">
              <div className="w-full md:max-w-xs">
                <div className="mb-4 h-12">
                  <Link href="/">
                    <DarkLogo className="h-full w-auto text-white" />
                  </Link>
                </div>
                <div className=" w-full pb-4">
                  <UserAccountNav dark showDetails />
                </div>

                {navigation.map((item, i) => {
                  if (!item.name)
                    return (
                      <div key={i} className="!my-6 border-t border-dark-600" />
                    )

                  if (item.name === 'Support the project') {
                    return <DonationMenu key={i} />
                  }

                  const props = item.onClick ? { onClick: item.onClick } : {}

                  return (
                    <Link
                      {...props}
                      key={item.name}
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : '_self'}
                      className={clsx(
                        window.location.href.endsWith(item.href)
                          ? ' bg-dark-700 text-dark-100'
                          : 'text-dark-300 hover:fill-dark-100 hover:text-dark-100',
                        'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          window.location.href.endsWith(item.href)
                            ? `!text-dark-400`
                            : `!text-dark-300 group-hover:text-white`,
                          'mr-3 h-6 w-6 flex-shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  )
                })}

                <div className="mx-2 mt-10 space-y-2 rounded border-2 border-red-900/50 p-4 transition-colors hover:border-red-700">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-dark-300">
                      {CommandDetail.commandDisable.title}
                    </p>

                    {loading && (
                      <Switch disabled size="lg" className="flex" color="red" />
                    )}
                    {!loading && (
                      <Switch
                        size="lg"
                        className="flex"
                        color="red"
                        onLabel="On"
                        offLabel="Off"
                        defaultChecked={isEnabled}
                        onChange={(e) =>
                          updateSetting(!!e?.currentTarget?.checked)
                        }
                      >
                        !mmr
                      </Switch>
                    )}
                  </div>
                  <p className="w-48 text-xs text-dark-400">
                    {CommandDetail.commandDisable.description}
                  </p>
                </div>
              </div>
            </div>
          </Navbar>
        }
        header={
          <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
            <div className="absolute top-0 right-0 z-[101] m-4">
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size="sm"
                color={theme.colors.gray[6]}
                mr="xl"
              />
            </div>
          </MediaQuery>
        }
      >
        <main className="px-4">
          <div className="min-h-full w-full max-w-screen-2xl space-y-6 pt-8 transition-all">
            <div className="mb-12 space-y-4">
              <h1 className="text-2xl font-bold leading-6 text-white">
                {title}
              </h1>
              <div className="text-dark-300">{subtitle}</div>
            </div>
            {children}
          </div>
        </main>
      </AppShell>
    </>
  )
}
