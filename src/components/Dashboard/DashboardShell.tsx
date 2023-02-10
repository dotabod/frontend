import React, { useState } from 'react'
import Link from 'next/link'
import { Switch } from '@mantine/core'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import { navigation } from '@/components/Dashboard/navigation'
import clsx from 'clsx'
import { UserAccountNav } from '@/components/UserAccountNav'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import { DonationMenu } from '@/components/DonationMenu'
import { DarkLogo } from '@/components/Logo'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Layout, Menu, MenuProps, theme as antTheme } from 'antd'
import { HeartIcon } from '@heroicons/react/24/outline'
const { Header, Sider, Content } = Layout

export default function DashboardShell({ children, title, subtitle }) {
  const [collapsed, setCollapsed] = useState(false)
  const {
    token: { colorBgContainer, colorBgLayout },
  } = antTheme.useToken()
  const [current, setCurrent] = useState('Setup')

  const onClick: MenuProps['onClick'] = (e) => {
    console.log('click ', e)
    setCurrent(e.key)
  }

  const {
    data: isDotabodDisabled,
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
      <Layout>
        <Sider
          style={{
            background: colorBgLayout,
          }}
          trigger={null}
          collapsible
          collapsed={collapsed}
        >
          <div className="logo" />

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

              <Menu
                onClick={onClick}
                selectedKeys={[current]}
                mode="inline"
                items={navigation.map((item, i) => {
                  if (!item.name) return { type: 'divider' }

                  if (item.name === 'Support the project') {
                    return {
                      key: 'donate',
                      icon: (
                        <HeartIcon
                          className={clsx(
                            `!text-red-500 group-hover:text-white`,
                            'mr-3 h-6 w-6 flex-shrink-0'
                          )}
                          aria-hidden="true"
                        />
                      ),
                      label: <DonationMenu />,
                    }
                  }

                  const props = item.onClick ? { onClick: item.onClick } : {}

                  return {
                    key: item.name,
                    icon: (
                      <item.icon
                        className={clsx('h-4 w-4')}
                        aria-hidden="true"
                      />
                    ),
                    label: (
                      <Link
                        {...props}
                        href={item.href}
                        target={
                          item.href.startsWith('http') ? '_blank' : '_self'
                        }
                        className={clsx(
                          'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors'
                        )}
                      >
                        {item.name}
                      </Link>
                    ),
                  }
                })}
              />

              <div
                className={clsx(
                  'mx-2 mt-10 space-y-2 rounded border-2 p-4 transition-colors',
                  isDotabodDisabled
                    ? 'border-red-900/50 hover:border-red-700'
                    : 'border-green-900/50 hover:border-green-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-dark-300">
                    Dotabod is {isDotabodDisabled ? 'disabled' : 'enabled'}
                  </p>

                  {loading && (
                    <Switch
                      disabled
                      size="lg"
                      className="flex"
                      color={isDotabodDisabled ? 'red' : 'green'}
                    />
                  )}
                  {!loading && (
                    <Switch
                      size="lg"
                      className="flex"
                      color={isDotabodDisabled ? 'red' : 'green'}
                      defaultChecked={isDotabodDisabled}
                      onChange={(e) =>
                        updateSetting(!!e?.currentTarget?.checked)
                      }
                    >
                      !mmr
                    </Switch>
                  )}
                </div>
                <p className="max-w-48 text-xs text-dark-400">
                  {CommandDetail.commandDisable.description}
                </p>
              </div>
            </div>
          </div>
        </Sider>
        <Layout className="site-layout">
          <Header
            style={{
              padding: 0,
              background: colorBgContainer,
            }}
          >
            {React.createElement(
              collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
              {
                className: 'trigger',
                onClick: () => setCollapsed(!collapsed),
              }
            )}
          </Header>
          <Content
            style={{
              background: colorBgContainer,
            }}
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
          </Content>
        </Layout>
      </Layout>
    </>
  )
}
