import Script from 'next/script'
import { useEffect } from 'react'
import { useCookiePreferences } from '@/lib/cookieManager'

const HubSpotScript = () => {
  const { preferences, hasConsented } = useCookiePreferences()

  // Initialize HubSpot settings via useEffect to avoid dangerouslySetInnerHTML
  useEffect(() => {
    // Initialize HubSpot tracking object
    window._hsq = window._hsq || []

    // Create a queue for callbacks when HubSpot conversations is ready
    window.hsConversationsOnReady = window.hsConversationsOnReady || []

    // Set minimal settings to ensure widget loads
    window.hsConversationsSettings = {
      loadImmediately: true,
      // Always enable identification regardless of cookie preferences
      identificationEnabled: true,
    }
  }, [hasConsented, preferences.marketing])

  return (
    <Script id='hs-script' strategy='afterInteractive' src='//js-na1.hs-scripts.com/39771134.js' />
  )
}

export default HubSpotScript
