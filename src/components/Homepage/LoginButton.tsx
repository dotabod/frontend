import * as Sentry from '@sentry/nextjs'
import { Button } from 'antd'
import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router'
import { signIn, useSession } from 'next-auth/react'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { UserAccountNav } from '../UserAccountNav'

interface LoginButtonProps extends ComponentProps<typeof Button> {
  className?: string
}

export function LoginButton({ className, ...props }: LoginButtonProps) {
  const searchParams = useSearchParams()
  const user = useSession()?.data?.user
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (user) {
    return <UserAccountNav className={className} />
  }

  return (
    <Button
      className={clsx(className)}
      loading={loading}
      onClick={() => {
        setLoading(true)
        return !user
          ? signIn('twitch', {
              redirect: false,
              callbackUrl:
                searchParams?.get('from') || searchParams?.get('callbackUrl') || '/dashboard',
            })
              .then((e) => {
                console.log(e)
              })
              .catch((e) => {
                Sentry.captureException(e)
                console.log(e)
              })
              .finally(() => setLoading(false))
          : router.push('/dashboard')
      }}
      {...props}
    >
      <span>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 48 48'
          width='48px'
          height='48px'
          className='mr-2 inline h-4 w-4'
          aria-hidden='true'
          focusable='false'
          data-prefix='fab'
          data-icon='twitch'
          role='img'
        >
          <path fill='#FFF' d='M12 32L12 8 39 8 39 26 33 32 24 32 18 38 18 32z' />
          <path
            fill='#8E24AA'
            d='M9,5l-3,7.123V38h9v5h5l5-5h7l10-10V5H9z M38,26l-5,5h-9l-5,5v-5h-6V9h25V26z'
          />
          <path fill='#8E24AA' d='M32 25h-5V15h5V25zM24 25h-5V15h5V25z' />
        </svg>
      </span>
      <span>Log in with Twitch</span>
    </Button>
  )
}
