import { App } from 'antd'
import Head from 'next/head'

// Separate component for invalid overlay pages to avoid hooks errors
export const InvalidOverlayPage = () => {
  const { notification } = App.useApp()

  notification.open({
    description: 'Please delete your overlay and setup Dotabod again by visiting dotabod.com',
    duration: 0,
    key: 'auth-error',
    message: 'Authentication failed',
    placement: 'bottomLeft',
    type: 'error',
  })

  return (
    <>
      <Head>
        <title>Dotabod | Invalid Overlay URL</title>
        <meta name='robots' content='noindex' />
      </Head>
      <style global jsx>{`
        html,
        body {
          overflow: hidden;
          background-color: transparent;
        }
      `}</style>
      <div className='hidden'>Invalid Dotabod overlay URL. Please check your OBS settings.</div>
    </>
  )
}

// Check for invalid overlay URLs in localStorage
export const checkForInvalidOverlay = (pathname: string): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }
  if (!pathname.includes('overlay/')) {
    return false
  }

  try {
    const pathKey = `invalid_overlay_${pathname}`
    const cachedData = localStorage.getItem(pathKey)

    if (cachedData) {
      const data = JSON.parse(cachedData)
      const { timestamp } = data
      const now = Date.now()

      // If the cached 404 is less than 1 day old, consider it valid
      if (timestamp && now - timestamp < 86_400_000) {
        return true
      }

      // Cached data is too old, remove it
      localStorage.removeItem(pathKey)
    }
  } catch {
    // Ignore storage errors
  }

  return false
}
