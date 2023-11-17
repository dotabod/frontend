import React from 'react'
import { Button } from 'antd'
import clsx from 'clsx'
import { signIn, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import UserAccountNav from '../UserAccountNav'

export const YouTubeSVG = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    x="0px"
    y="0px"
    width="100"
    height="100"
    viewBox="0 0 48 48"
    className="inline h-5 w-5"
    aria-hidden="true"
    focusable="false"
    data-prefix="fab"
    data-icon="youtube"
    role="img"
  >
    <path
      fill="#FF3D00"
      d="M43.2,33.9c-0.4,2.1-2.1,3.7-4.2,4c-3.3,0.5-8.8,1.1-15,1.1c-6.1,0-11.6-0.6-15-1.1c-2.1-0.3-3.8-1.9-4.2-4C4.4,31.6,4,28.2,4,24c0-4.2,0.4-7.6,0.8-9.9c0.4-2.1,2.1-3.7,4.2-4C12.3,9.6,17.8,9,24,9c6.2,0,11.6,0.6,15,1.1c2.1,0.3,3.8,1.9,4.2,4c0.4,2.3,0.9,5.7,0.9,9.9C44,28.2,43.6,31.6,43.2,33.9z"
    ></path>
    <path fill="#FFF" d="M20 31L20 17 32 24z"></path>
  </svg>
)

export const TwitchSVG = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="48px"
    height="48px"
    className="inline h-5 w-5"
    aria-hidden="true"
    focusable="false"
    data-prefix="fab"
    data-icon="twitch"
    role="img"
  >
    <path fill="#FFF" d="M12 32L12 8 39 8 39 26 33 32 24 32 18 38 18 32z" />
    <path
      fill="#8E24AA"
      d="M9,5l-3,7.123V38h9v5h5l5-5h7l10-10V5H9z M38,26l-5,5h-9l-5,5v-5h-6V9h25V26z"
    />
    <path fill="#8E24AA" d="M32 25h-5V15h5V25zM24 25h-5V15h5V25z" />
  </svg>
)

export function LoginButton({ className = '', ...props }) {
  const searchParams = useSearchParams()
  const user = useSession()?.data?.user

  const [isLoading, setIsLoading] = React.useState<'google' | 'twitch'>()

  const handleSignIn = (provider: 'google' | 'twitch') => {
    setIsLoading(provider)
    signIn(provider, {
      redirect: false,
      callbackUrl: searchParams.get('from') || '/dashboard',
    })
      .catch((e) => {
        console.error(e)
        setIsLoading(undefined)
      })
      .then((e) => {
        console.log(e)
      })
  }

  if (user) {
    return <UserAccountNav />
  }

  return (
    <div className={!props.block && 'space-x-2'}>
      <Button
        className={clsx(className)}
        loading={isLoading === 'twitch'}
        onClick={() => handleSignIn('twitch')}
        {...props}
      >
        <span className="space-x-2">
          <TwitchSVG />
          <span>Sign in with Twitch</span>
        </span>
      </Button>
      <Button
        loading={isLoading === 'google'}
        onClick={() => handleSignIn('google')}
        style={{ marginTop: '10px' }}
        className="hover:!border-red-400 hover:!text-red-400"
        {...props}
      >
        <span className="space-x-2">
          <YouTubeSVG />
          <span>Sign in with YouTube</span>
        </span>
      </Button>
    </div>
  )
}
