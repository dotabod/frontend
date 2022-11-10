import Link from 'next/link'

import { DashboardNav } from '@/components/dashboard-nav'
import { UserAccountNav } from '@/components/user-account-nav'
import Image from 'next/image'
import { useSession } from 'next-auth/react'

interface DashboardLayoutProps {
  children?: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = useSession()?.data?.user

  return (
    <div className="mx-auto flex h-full max-w-[1440px] flex-col space-y-6 overflow-hidden px-6">
      <header className="flex h-[64px] items-center justify-between pl-2">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/images/peepofat.gif"
            width={58}
            height={58}
            alt="peepofat"
            priority
            className="h-6 w-6"
          />
          <span className="text-lg font-bold">Dotabod</span>
        </Link>
        <UserAccountNav />
      </header>
      <div className="grid grid-cols-[200px_1fr] gap-12">
        <aside className="flex w-[200px] flex-col">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

