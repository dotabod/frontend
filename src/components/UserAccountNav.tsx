import { useSession } from 'next-auth/react'

import { fetcher } from '@/lib/fetcher'
import clsx from 'clsx'
import type { Session } from 'next-auth'
import Image from 'next/image'
import useSWR from 'swr'

interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  user: Session['user']
  icon?: React.ReactNode
}

const UserButton = ({ user }: UserButtonProps) => {
  const { data } = useSWR('/api/settings', fetcher)
  const isLive = data?.stream_online

  return (
    <Image
      width={36}
      height={36}
      alt="User Avatar"
      src={user?.image || '/images/hero/default.png'}
      className={clsx(
        'overflow-hidden rounded-full',
        isLive && 'rounded-full border-2 border-solid border-red-500'
      )}
    />
  )
}

UserButton.displayName = 'UserButton'

export function UserAccountNav() {
  const user = useSession()?.data?.user

  return <UserButton user={user} />
}
