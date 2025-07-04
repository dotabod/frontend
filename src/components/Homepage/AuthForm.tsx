import { captureException } from '@sentry/nextjs'
import { Button } from 'antd'
import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import * as React from 'react'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const searchParams = useSearchParams()

  return (
    <div className={clsx(className)} {...props}>
      <Button
        loading={isLoading}
        block
        size='large'
        onClick={() => {
          setIsLoading(true)
          signIn('twitch', {
            redirect: false,
            callbackUrl:
              searchParams?.get('from') || searchParams?.get('callbackUrl') || '/dashboard',
          })
            .then((e) => {
              console.log(e)
            })
            .catch((e) => {
              captureException(e)
              console.log(e)
            })
            .finally(() => setIsLoading(false))
        }}
      >
        <span className='space-x-2'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 48 48'
            width='48px'
            height='48px'
            className='inline h-5 w-5'
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
          <span>Sign in with Twitch</span>
        </span>
      </Button>
    </div>
  )
}
