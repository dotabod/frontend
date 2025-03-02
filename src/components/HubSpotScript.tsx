import { useCookiePreferences } from '@/lib/cookieManager'
import Script from 'next/script'
import { useEffect } from 'react'

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

    // If user has made a choice about cookies and doesn't want marketing
    if (hasConsented && !preferences.marketing) {
      // Use doNotTrack with the correct parameters to disable tracking but keep identification
      // According to docs: doNotTrack can take an object parameter { track: true, identify: false }
      // This disables tracking but allows identification
      window._hsq.push(['doNotTrack', { track: true, identify: false }])
    }
  }, [hasConsented, preferences.marketing])

  return (
    <Script id='hs-script' strategy='afterInteractive' src='//js-na1.hs-scripts.com/39771134.js' />
  )
}

export default HubSpotScript
