import React, { useState } from 'react'
import Link from 'next/link'
import { navigation } from '@/components/Dashboard/navigation'
import clsx from 'clsx'
import { UserAccountNav } from '@/components/UserAccountNav'
import { DarkLogo } from '@/components/Logo'
import { Layout, Menu, MenuProps, theme } from 'antd'
import {
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { DisableToggle } from '@/components/Dashboard/DisableToggle'

const { Header, Sider, Content } = Layout

export default function DashboardShell({
  children,
}: {
  children: React.ReactElement
}) {
  const [collapsed, setCollapsed] = useState(false)
  const {
    token: { colorBgContainer, colorBgLayout },
  } = theme.useToken()
  const [current, setCurrent] = useState('Setup')

  const onClick: MenuProps['onClick'] = (e) => {
    setCurrent(e.key)
  }

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
          width={250}
          className="border-r border-r-dark-500"
          trigger={null}
          collapsible
          collapsed={collapsed}
        >
          <div className="logo" />

          <div className="flex flex-col items-end">
            <div className="w-full md:max-w-xs">
              <div
                className={clsx(
                  collapsed ? 'justify-center' : 'justify-between',
                  'm-auto mb-4 flex h-12 w-full px-4 pt-4'
                )}
              >
                {!collapsed && (
                  <Link href="/">
                    <DarkLogo className="h-full w-auto text-white" />
                  </Link>
                )}

                <button
                  className="flex items-center text-dark-300 transition-all hover:scale-110 hover:text-dark-200"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? (
                    <Bars3Icon className="h-6 w-6" />
                  ) : (
                    <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                  )}
                </button>
              </div>
              <div className="w-full p-2">
                <UserAccountNav dark showDetails={!collapsed} />
              </div>

              <Menu
                onClick={onClick}
                selectedKeys={[current]}
                style={{
                  background: colorBgLayout,
                }}
                mode="inline"
                items={navigation.map((item, i) => {
                  if (!item.name)
                    return {
                      type: 'divider',
                      className: '!m-6 !bg-dark-500',
                    }

                  const props = item.onClick ? { onClick: item.onClick } : {}

                  return {
                    ...item,
                    key: item.name,
                    icon: (
                      <item.icon
                        className={clsx('h-4 w-4')}
                        aria-hidden="true"
                      />
                    ),
                    label: item.href ? (
                      <Link
                        {...props}
                        href={item.href}
                        target={
                          item.href.startsWith('http') ? '_blank' : '_self'
                        }
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    ),
                  }
                })}
              />

              <DisableToggle collapsed={collapsed} />
            </div>
          </div>
        </Sider>
        <Layout className="site-layout">
          <Content
            style={{
              background: colorBgContainer,
            }}
          >
            <main className="px-4">
              <div className="min-h-full w-full max-w-screen-2xl space-y-6 pt-8 transition-all">
                {children}
              </div>
            </main>
          </Content>
        </Layout>
      </Layout>
    </>
  )
}
