import { App } from 'antd'
import Head from 'next/head'

// Separate component for invalid overlay pages to avoid hooks errors
export const InvalidOverlayPage = () => {
  const { notification } = App.useApp()

  notification.open({
    key: 'auth-error',
    type: 'error',
    duration: 0,
    placement: 'bottomLeft',
    message: 'Authentication failed',
    description: 'Please delete your overlay and setup Dotabod again by visiting dotabod.com',
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
  if (typeof window === 'undefined' || !window.localStorage) return false
  if (!pathname.includes('overlay/')) return false

  try {
    const pathKey = `invalid_overlay_${pathname}`
    const cachedData = localStorage.getItem(pathKey)

    if (cachedData) {
      const data = JSON.parse(cachedData)
      const timestamp = data.timestamp
      const now = Date.now()

      // If the cached 404 is less than 1 day old, consider it valid
      if (timestamp && now - timestamp < 86400000) {
        return true
      }

      // Cached data is too old, remove it
      localStorage.removeItem(pathKey)
    }
  } catch (e) {
    // Ignore storage errors
  }

  return false
}

/**
 * Applies global styles for the invalid overlay page.
 * This should be called from _app.tsx when an overlay is determined to be invalid.
 */
export const applyInvalidOverlayGlobalStyles = () => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.backgroundColor = 'transparent'
  }
}

/**
 * Resets global styles that might have been applied for the invalid overlay page.
 * This should be called from _app.tsx when an overlay is determined to be valid again or on other pages.
 */
export const resetInvalidOverlayGlobalStyles = () => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    document.body.style.backgroundColor = '' // Or your default background
  }
}
