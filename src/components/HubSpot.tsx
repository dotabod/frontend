import { useRouter } from 'next/router'
import Script from 'next/script'
import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

const HubSpot = () => {
  const { data, status } = useSession()
  const router = useRouter()
  // Never load the support chat or sync contacts inside OBS overlay browser sources.
  // /overlay still renders the dashboard UI; only /overlay/[userId] is the OBS source.
  const isOverlay = router.pathname.startsWith('/overlay/[userId]')
  // Tracks whether widget.load() has already run, so a later login re-identifies.
  const loadedRef = useRef(false)

  useEffect(() => {
    if (isOverlay || status === 'loading') {
      return
    }

    window._hsq = window._hsq || []
    window.hsConversationsOnReady = window.hsConversationsOnReady || []
    // Keep the widget from auto-loading before identity resolves, but preserve any
    // Identification already set on a previous run so we don't transiently drop it.
    window.hsConversationsSettings = {
      ...window.hsConversationsSettings,
      loadImmediately: false,
    }

    // Each effect run owns its own `cancelled` flag; the cleanup flips it so any
    // Queued onReady callback from a superseded run becomes a no-op.
    let cancelled = false

    const loadWith = (identity?: { email: string; token: string }) => {
      if (cancelled) {
        return
      }

      window.hsConversationsSettings = identity
        ? {
            identificationEmail: identity.email,
            identificationToken: identity.token,
            loadImmediately: false,
          }
        : { loadImmediately: false }

      const run = () => {
        if (cancelled) {
          return
        }
        // Re-identifying (login/logout without a full reload) requires resetting
        // The widget before it reloads with the new identity.
        if (loadedRef.current) {
          window.HubSpotConversations?.clear?.({ resetWidget: true })
        }
        window.HubSpotConversations?.widget?.load()
        loadedRef.current = true
      }

      if (window.HubSpotConversations) {
        run()
      } else {
        window.hsConversationsOnReady?.push(run)
      }
    }

    if (status === 'authenticated' && data?.user?.email) {
      fetch('/api/hubspot/visitor-token')
        .then((res) => (res.ok && res.status !== 204 ? res.json() : null))
        .then((payload: { email?: string; token?: string } | null) => {
          if (cancelled) {
            return
          }
          if (payload?.email && payload?.token) {
            window._hsq.push(['identify', { email: payload.email, name: data.user?.name }])
            // Identify is only transmitted to HubSpot on the next trackPageView.
            window._hsq.push(['trackPageView'])
            loadWith({ email: payload.email, token: payload.token })
          } else if (!loadedRef.current) {
            // No identity available and nothing loaded yet — still show the widget.
            loadWith()
          }
        })
        .catch(() => {
          // Don't downgrade an already-identified widget; only load if nothing has.
          if (!cancelled && !loadedRef.current) {
            loadWith()
          }
        })
    } else {
      // Anonymous visitor: load the widget without identification.
      loadWith()
    }

    return () => {
      cancelled = true
    }
  }, [isOverlay, status, data?.user?.email])

  if (isOverlay) {
    return null
  }

  return (
    <Script id='hs-script' strategy='afterInteractive' src='//js-na1.hs-scripts.com/39771134.js' />
  )
}

export default HubSpot
