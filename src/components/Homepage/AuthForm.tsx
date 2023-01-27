import * as React from 'react'
import { signIn } from 'next-auth/react'
import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { LoadingOverlay } from '@mantine/core'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const searchParams = useSearchParams()

  return (
    <div className={clsx('grid gap-6', className)} {...props}>
      <button
        type="button"
        className="relative inline-flex w-full items-center justify-center space-x-2 rounded-lg border bg-white px-5 py-2.5 text-center text-sm font-medium text-black hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-[#24292F]/50 disabled:opacity-50 dark:hover:bg-[#050708]/30 dark:focus:ring-slate-500"
        onClick={() => {
          setIsLoading(true)
          signIn('twitch', {
            redirect: false,
            callbackUrl: searchParams.get('from') || '/dashboard',
          })
            .catch((e) => {
              console.log(e)
              setIsLoading(false)
            })
            .then((e) => {
              console.log(e)
            })
        }}
        disabled={isLoading}
      >
        <LoadingOverlay
          visible={isLoading}
          loaderProps={{ size: 'lg', color: 'pink' }}
          overlayOpacity={0.3}
          overlayColor="#c5c5c5"
          className="rounded"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          width="48px"
          height="48px"
          className="mr-2 h-4 w-4"
          aria-hidden="true"
          focusable="false"
          data-prefix="fab"
          data-icon="twitch"
          role="img"
        >
          <path
            fill="#FFF"
            d="M12 32L12 8 39 8 39 26 33 32 24 32 18 38 18 32z"
          />
          <path
            fill="#8E24AA"
            d="M9,5l-3,7.123V38h9v5h5l5-5h7l10-10V5H9z M38,26l-5,5h-9l-5,5v-5h-6V9h25V26z"
          />
          <path fill="#8E24AA" d="M32 25h-5V15h5V25zM24 25h-5V15h5V25z" />
        </svg>
        <span>Sign in with Twitch</span>
      </button>
    </div>
  )
}
