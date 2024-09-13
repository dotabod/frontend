import { DisableToggle } from '@/components/Dashboard/DisableToggle'
import { navigation } from '@/components/Dashboard/navigation'
import { DarkLogo } from '@/components/Logo'
import { UserAccountNav } from '@/components/UserAccountNav'
import useMaybeSignout from '@/lib/hooks/useMaybeSignout'
import { StyleProvider } from '@ant-design/cssinjs'
import { Bars3Icon } from '@heroicons/react/24/outline'
import '@mantine/core/styles.css'
import {
  App as AntProvider,
  ConfigProvider,
  Layout,
  Menu,
  type MenuProps,
  theme,
} from 'antd'
import clsx from 'clsx'
import { ArrowLeft } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import type React from 'react'
import { useEffect, useState } from 'react'

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
  const { status } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [broken, setBroken] = useState(false)
  const [current, setCurrent] = useState('/dashboard')

  const onClick: MenuProps['onClick'] = (e) => {
    setCurrent(e.key)
    if (broken) setCollapsed(true)
  }

  useMaybeSignout()

  useEffect(() => {
    const lastUpdate = localStorage.getItem('lastSingleRunAPI')
    const now = new Date()

    if (
      !lastUpdate ||
      now.getTime() - Number(lastUpdate) > 24 * 60 * 60 * 1000
    ) {
      localStorage.setItem('lastSingleRunAPI', String(now.getTime()))
      fetch('/api/update-followers').catch((error) => console.error(error))
      fetch('/api/make-dotabod-mod').catch((error) => console.error(error))
    }
  }, [])

  useEffect(() => {
    const { pathname } = window.location
    setCurrent(pathname)
  }, [])

  if (status !== 'authenticated') return null

  return (
    <>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          components: {
            Spin: {
              colorPrimary: 'var(--color-purple-300)',
            },
            Button: {
              colorLink: 'var(--color-purple-300)',
              colorPrimaryHover: 'var(--color-purple-300)',
            },
            Tabs: {
              colorPrimary: 'var(--color-purple-400)',
              itemHoverColor: 'var(--color-purple-300)',
            },
            Menu: {
              subMenuItemBg: 'var(--color-gray-800)',
              itemBg: 'var(--color-gray-900)',
              itemHoverBg: 'var(--color-gray-700)',
              itemSelectedBg: 'var(--color-gray-600)',
              itemSelectedColor: 'var(--color-gray-200)',
              itemColor: 'var(--color-gray-300)',
            },
            Switch: {
              colorPrimary: 'var(--color-purple-900)',
            },
            Steps: {
              colorPrimary: 'var(--color-purple-500)',
              colorPrimaryHover: 'var(--color-purple-300)',
              colorPrimaryActive: 'var(--color-purple-300)',
            },
            Layout: {
              siderBg: 'var(--color-gray-900)',
            },
          },
          token: {
            colorPrimary: 'rgb(85, 24, 103)',
            colorLink: 'var(--color-purple-500)',
            colorLinkActive: 'var(--color-purple-300)',
            colorLinkHover: 'var(--color-purple-300)',
            colorText: 'var(--color-gray-200)',
            colorBgLayout: 'var(--color-gray-900)',
            colorBgContainer: 'var(--color-gray-800)',
          },
        }}
      >
        <StyleProvider hashPriority="high">
          <AntProvider>
            <Layout className="h-full bg-gray-800">
              <Sider
                breakpoint="md"
                onBreakpoint={(broken) => {
                  setCollapsed(broken)
                  setBroken(broken)
                }}
                width={250}
                className={clsx(
                  'border-r border-r-gray-500',
                  collapsed && '!min-w-11 !max-w-11'
                )}
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
                        type="button"
                        className="flex items-center text-gray-300 transition-all hover:scale-110 hover:text-gray-200"
                        onClick={() => setCollapsed(!collapsed)}
                      >
                        {collapsed ? (
                          <Bars3Icon className="h-6 w-6" />
                        ) : (
                          <ArrowLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>

                    <Menu
                      onClick={onClick}
                      selectedKeys={[current]}
                      defaultOpenKeys={['/dashboard/features']}
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
                className={clsx(
                  '!bg-gray-800',
                  broken && !collapsed && '!hidden'
                )}
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
                    <UserAccountNav />
                  </div>
                </Header>
                <Content className="min-h-full w-full space-y-6 bg-gray-800 p-8 transition-all">
                  {children}
                </Content>
              </Layout>
            </Layout>
          </AntProvider>
        </StyleProvider>
      </ConfigProvider>
    </>
  )
}
