import Script from 'next/script'
import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

const HubSpot = () => {
  const { data, status } = useSession()
  // Tracks whether widget.load() has already run, so a later login re-identifies.
  const loadedRef = useRef(false)

  useEffect(() => {
    if (status === 'loading') return

    window._hsq = window._hsq || []
    window.hsConversationsOnReady = window.hsConversationsOnReady || []
    // Wait to load until identity (if any) is resolved, so identification is set first.
    window.hsConversationsSettings = { loadImmediately: false }

    const loadWidget = () => {
      const run = () => {
        if (loadedRef.current) {
          window.HubSpotConversations?.clear?.({ resetWidget: true })
        }
        window.HubSpotConversations?.widget.load()
        loadedRef.current = true
      }
      if (window.HubSpotConversations) {
        run()
      } else {
        window.hsConversationsOnReady?.push(run)
      }
    }

    if (status === 'authenticated' && data?.user?.email) {
      let cancelled = false
      fetch('/api/hubspot/visitor-token')
        .then((res) => (res.ok ? res.json() : null))
        .then((payload: { email?: string; token?: string } | null) => {
          if (cancelled) return
          if (payload?.email && payload?.token) {
            window._hsq.push(['identify', { email: payload.email }])
            window.hsConversationsSettings = {
              ...window.hsConversationsSettings,
              identificationEmail: payload.email,
              identificationToken: payload.token,
            }
          }
          loadWidget()
        })
        .catch(() => {
          // Token failed — still load the widget so support chat works, just unidentified.
          if (!cancelled) loadWidget()
        })
      return () => {
        cancelled = true
      }
    }

    // Anonymous visitor: load the widget without identification.
    loadWidget()
  }, [status, data?.user?.email])

  return (
    <Script id='hs-script' strategy='afterInteractive' src='//js-na1.hs-scripts.com/39771134.js' />
  )
}

export default HubSpot
