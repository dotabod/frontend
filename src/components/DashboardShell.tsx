import { Fragment, useState, forwardRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  BeakerIcon,
  BoltIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { DarkLogo } from '@/components/Logo'
import Link from 'next/link'
import Image from 'next/image'
import { UserAccountNav } from '@/components/user-account-nav'
import { Github } from 'lucide-react'
import DiscordSvg from '@/images/logos/discord.svg'
import { Group, Text, Select, Switch } from '@mantine/core'
import { useUpdateLocale, useUpdateSetting } from '@/lib/useUpdateSetting'
import { DBSettings } from '@/lib/DBSettings'

const localeOptions = [
  {
    flag: '🇺🇸',
    label: 'English',
    value: 'en',
  },

  {
    flag: '🇮🇹',
    label: 'Italian',
    value: 'it',
  },
  {
    flag: '🇷🇺',
    label: 'Russian',
    value: 'ru',
  },
  {
    flag: '🇪🇸',
    label: 'Spanish',
    value: 'es',
  },
  {
    flag: '🇧🇷',
    label: 'Portuguese (Brazil)',
    value: 'pt-BR',
  },
  {
    flag: '🇵🇹',
    label: 'Portuguese (Portugal)',
    value: 'pt',
  },
]

interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
  flag: string
  label: string
}

const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ flag, label, ...others }: ItemProps, ref) => (
    <div ref={ref} {...others}>
      <Group noWrap>
        <Text size="sm">{flag}</Text>

        <div>
          <Text size="sm">{label}</Text>
        </div>
      </Group>
    </div>
  )
)

SelectItem.displayName = 'SelectItem'

export const navigation = [
  {
    name: 'Setup',
    href: '/dashboard',
    icon: BeakerIcon,
  },
  {
    name: 'Features',
    href: '/dashboard/features',
    icon: BoltIcon,
  },
  {
    name: 'Commands',
    href: '/dashboard/commands',
    icon: CommandLineIcon,
  },
  {
    name: 'Troubleshoot',
    href: '/dashboard/troubleshoot',
    icon: QuestionMarkCircleIcon,
  },
  {
    name: '',
    href: '',
    icon: null,
  },
  {
    name: 'Github',
    href: 'https://github.com/dotabod/',
    icon: Github,
  },
  {
    name: 'Discord',
    href: 'https://discord.dotabod.com',
    icon: ({ ...props }) => <Image alt="discord" src={DiscordSvg} {...props} />,
  },
]

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function DashboardShell({ children, title, subtitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    data: isEnabled,
    loading,
    updateSetting,
  } = useUpdateSetting(DBSettings.commandDisable)

  const {
    data,
    loading: loadingLocale,
    update: updateLocale,
  } = useUpdateLocale()

  return (
    <>
      <style global jsx>{`
        html,
        body {
          background-color: rgb(39, 41, 52) !important;
        }
        ::-webkit-scrollbar {
          width: 6px;
          outline: none;
          border: none;
          background: transparent;
          padding: 3px;
        }

        ::-webkit-scrollbar-thumb {
          background: ${'#43454F'};
          border-radius: 6px;
        }

        ::-webkit-scrollbar-track {
          background: ${'rgba(0, 0, 0, 0.14)'};
          border-radius: 6px;
        }
      `}</style>
      <div className=" bg-dark-700">
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-40 md:hidden"
            onClose={setSidebarOpen}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
            </Transition.Child>

            <div className="fixed inset-0 z-40 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-dark-800">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                      <button
                        type="button"
                        className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
                    <div className="flex flex-shrink-0 items-center justify-between px-4">
                      <Link href="/">
                        <DarkLogo className="h-12 w-auto text-white" />
                      </Link>
                      <UserAccountNav dark />
                    </div>
                    <nav className="mt-5 space-y-1 px-2">
                      {navigation.map((item, i) => {
                        if (!item.name)
                          return (
                            <div
                              key={i}
                              className="!my-6 border-t border-dark-600"
                            />
                          )

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={classNames(
                              window.location.href.endsWith(item.href)
                                ? ' bg-dark-700 text-dark-100'
                                : 'text-dark-300 hover:fill-gray-50 hover:text-dark-100',
                              'group flex items-center rounded-md px-2 py-2 text-base font-medium'
                            )}
                          >
                            <item.icon
                              className={classNames(
                                window.location.href.endsWith(item.href)
                                  ? 'text-dark-400'
                                  : 'text-dark-300 group-hover:text-white',
                                'mr-4 h-6 w-6 flex-shrink-0'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        )
                      })}
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
              <div className="w-14 flex-shrink-0">
                {/* Force sidebar to shrink to fit close icon */}
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="z-30 hidden bg-dark-800 md:fixed md:inset-y-0 md:flex md:flex-col md:border-r md:border-dark-600 md:pt-5 md:pb-4 2xl:pl-64">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex flex-shrink-0 items-center px-6">
            <Link href="/">
              <DarkLogo className="h-12 w-auto" />
            </Link>
          </div>
          <div className="mt-5 flex h-0 flex-1 flex-col overflow-y-auto pt-1">
            <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
              <div className="flex flex-shrink-0 items-center justify-between px-4">
                <UserAccountNav dark showDetails />
              </div>
              <nav className="mt-5 flex-1 space-y-1 bg-dark-800 px-2">
                {navigation.map((item, i) => {
                  if (!item.name)
                    return (
                      <div key={i} className="!my-6 border-t border-dark-600" />
                    )

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        window.location.href.endsWith(item.href)
                          ? ' bg-dark-700 text-dark-100'
                          : 'text-dark-300 hover:fill-dark-100 hover:text-dark-100',
                        'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors'
                      )}
                    >
                      <item.icon
                        className={classNames(
                          window.location.href.endsWith(item.href)
                            ? 'text-dark-400'
                            : 'text-dark-300 group-hover:text-white',
                          'mr-3 h-6 w-6 flex-shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              <div className="ml-1 mr-2 space-y-2 rounded border-2 border-red-900/50 p-4 transition-colors hover:border-red-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-dark-300">Disable Dotabod</p>

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
                  With this turned on, game events will no longer be recognized
                  and commands will not be responded to.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col  bg-dark-700 pb-12 transition-all 2xl:pl-64">
          <div className="sticky top-0 z-10 bg-dark-800 pl-1 pt-1 sm:pl-3 sm:pt-3 md:hidden">
            <button
              type="button"
              className="-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-md text-dark-400 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="sticky top-0 z-10 hidden h-full w-full flex-shrink-0 items-center justify-between bg-dark-800 px-4 py-2  md:flex md:px-8 md:pr-12 md:pl-72">
            {!loadingLocale && (
              <Select
                placeholder="Language selector"
                itemComponent={SelectItem}
                data={localeOptions}
                maxDropdownHeight={400}
                defaultValue={data?.locale}
                onChange={updateLocale}
                filter={(value, item) =>
                  item.label.toLowerCase().includes(value.toLowerCase().trim())
                }
              />
            )}
            {loadingLocale && (
              <Select
                placeholder="Language selector"
                itemComponent={SelectItem}
                data={localeOptions}
                maxDropdownHeight={400}
                disabled
              />
            )}

            <UserAccountNav dark />
          </div>
          <main className="w-full bg-dark-700 px-4 md:pr-12 md:pl-72">
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
        </div>
      </div>
    </>
  )
}
