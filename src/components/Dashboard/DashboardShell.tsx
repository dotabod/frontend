import React, { useState, useEffect } from 'react'
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

function getItem(item) {
  const props = item.onClick ? { onClick: item.onClick } : {}

  return {
    key: item.href,
    icon: item.icon ? (
      <item.icon className={clsx('h-4 w-4')} aria-hidden="true" />
    ) : null,
    label: item.href ? (
      <Link
        {...props}
        href={item.href}
        className="!text-gray-200"
        target={item.href.startsWith('http') ? '_blank' : '_self'}
      >
        {item.name}
      </Link>
    ) : (
      item.name
    ),
    children: item.children?.map(getItem),
  }
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactElement
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [broken, setBroken] = useState(false)
  const {
    token: { colorBgLayout },
  } = theme.useToken()
  const [current, setCurrent] = useState('/dashboard')

  const onClick: MenuProps['onClick'] = (e) => {
    setCurrent(e.key)
  }

  useEffect(() => {
    const { pathname } = window.location
    setCurrent(pathname)
  }, [])

  return (
    <>
      <style global jsx>{`
        html,
        body {
          @apply !bg-gray-800;
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
          @apply bg-gray-500;
          border-radius: 6px;
        }

        ::-webkit-scrollbar-track {
          @apply bg-transparent/10;
          border-radius: 6px;
        }
      `}</style>
      <Layout className="h-full bg-gray-800">
        <Sider
          breakpoint="md"
          onBreakpoint={(broken) => {
            setCollapsed(broken)
            setBroken(broken)
          }}
          style={{
            background: colorBgLayout,
          }}
          width={250}
          className="border-r border-r-gray-500"
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
                    <DarkLogo className="h-full w-auto" />
                  </Link>
                )}

                <button
                  className="flex items-center text-gray-300 transition-all hover:scale-110 hover:text-gray-200"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? (
                    <Bars3Icon className="h-6 w-6" />
                  ) : (
                    <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                  )}
                </button>
              </div>

              <Menu
                onClick={onClick}
                selectedKeys={[current]}
                defaultOpenKeys={['/dashboard/features']}
                style={{
                  background: colorBgLayout,
                }}
                mode="inline"
                items={navigation.map((item, i) => {
                  if (!item.name)
                    return {
                      key: item?.href || i,
                      type: 'divider',
                      className: '!m-6 !bg-gray-500',
                    }

                  return getItem(item)
                })}
              />
            </div>
          </div>
        </Sider>
        <Layout
          className={clsx('!bg-gray-800', broken && !collapsed && '!hidden')}
        >
          <Header
            className={clsx(
              '!bg-gray-900',
              broken && !collapsed && '!hidden',
              'flex w-full items-center justify-between !p-8'
            )}
          >
            <DisableToggle />

            <div className="w-fit py-2">
              <UserAccountNav dark showDetails={!collapsed} />
            </div>
          </Header>
          <Content className="min-h-full w-full space-y-6 bg-gray-800 p-8 transition-all">
            {children}
          </Content>
        </Layout>
      </Layout>
    </>
  )
}
