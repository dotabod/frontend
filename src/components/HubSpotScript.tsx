import { useCookiePreferences } from '@/lib/cookieManager'
import Script from 'next/script'
import { useEffect } from 'react'

const HubSpotScript = () => {
  const { preferences, hasConsented } = useCookiePreferences()

  // Chat functionality should always be available, but tracking requires marketing consent
  const enableTracking = hasConsented && preferences.marketing

  // Initialize HubSpot settings via useEffect
  useEffect(() => {
    // Initialize HubSpot tracking object (needed for both chat and tracking)
    window._hsq = window._hsq || []

    // Create a queue for callbacks when HubSpot conversations is ready
    window.hsConversationsOnReady = window.hsConversationsOnReady || []

    // Set minimal settings to ensure chat widget loads
    window.hsConversationsSettings = {
      loadImmediately: true,
    }

    // If user has loaded the page and made a choice about cookies
    if (hasConsented) {
      // Configure HubSpot tracking based on user preferences
      if (window.HubSpotConsentConfig) {
        window.HubSpotConsentConfig.setTrackingCookiesAllowed(preferences.marketing)
      }

      // If tracking is not allowed, push privacy settings to HubSpot
      if (!preferences.marketing) {
        window._hsq.push(['doNotTrack', true])
      }
    }
  }, [hasConsented, preferences.marketing])

  return (
    <>
      {/* Always load the HubSpot script for chat functionality */}
      <Script
        id='hs-script'
        strategy='afterInteractive'
        src='//js-na1.hs-scripts.com/39771134.js'
        onLoad={() => {
          // Once script is loaded, configure tracking consent
          if (window.HubSpotConsentConfig) {
            window.HubSpotConsentConfig.setTrackingCookiesAllowed(enableTracking)
          }

          // If tracking is not allowed, push privacy settings to HubSpot
          if (!enableTracking) {
            window._hsq = window._hsq || []
            window._hsq.push(['doNotTrack', true])
          }
        }}
      />
    </>
  )
}

export default HubSpotScript
