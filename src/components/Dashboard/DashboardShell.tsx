import { navigation } from '@/components/Dashboard/navigation'
import { UserAccountNav } from '@/components/UserAccountNav'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeProvider } from '@/components/ui/theme-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import useMaybeSignout from '@/lib/hooks/useMaybeSignout'
import { App as AntProvider } from 'antd'
import clsx from 'clsx'
import { PanelLeft, Settings } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import type React from 'react'
import { useEffect } from 'react'
import { DarkLogo } from '../Logo'
import { DisableToggle } from './DisableToggle'

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

  if (status !== 'authenticated') return null

  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <AntProvider>
          <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
              <TooltipProvider>
                <nav className="flex flex-col items-center gap-4 px-2 py-4">
                  <Link
                    href="#"
                    className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                  >
                    <DarkLogo
                      hideText
                      className="h-4 w-4 transition-all group-hover:scale-110"
                    />
                    <span className="sr-only">Dotabod</span>
                  </Link>
                  {navigation.map((item) => {
                    if (!item.name || !item.href) return null

                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                          >
                            {item.icon && <item.icon className="h-5 w-5" />}
                            <span className="sr-only">{item.name}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </nav>
                <nav className="mt-auto flex flex-col items-center gap-4 px-2 py-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="#"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                      >
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Settings</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Settings</TooltipContent>
                  </Tooltip>
                </nav>
              </TooltipProvider>
            </aside>
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
              <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden">
                      <PanelLeft className="h-5 w-5" />
                      <span className="sr-only">Toggle Menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="sm:max-w-xs">
                    <nav className="grid gap-6 text-lg font-medium">
                      {navigation.map((item) => {
                        if (!item.name || !item.href) return null

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {item.icon && <item.icon className="h-5 w-5" />}
                            {item.name}
                          </Link>
                        )
                      })}
                    </nav>
                  </SheetContent>
                </Sheet>
                <Breadcrumb className="hidden md:flex">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href="#">Dashboard</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href="#">Features</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Main</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="relative ml-auto flex-1 md:grow-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="overflow-hidden rounded-full"
                      >
                        <UserAccountNav />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          signOut({
                            callbackUrl: `${window.location.origin}/`,
                          })
                        }
                      >
                        Logout
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <DisableToggle />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>
            </div>

            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
              <div className="mx-auto grid max-w-[59rem] flex-1 auto-rows-max gap-4">
                {children}
              </div>
            </main>
          </div>
        </AntProvider>
      </ThemeProvider>
    </>
  )
}
