import { useCallback, useEffect, useState } from 'react'

// Cookie preferences type
export type CookiePreferences = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  preferences: boolean
}

// Cookie storage key
const COOKIE_PREFERENCES_KEY = 'cookieConsent'

// Global event names for cookie consent
export const COOKIE_EVENTS = {
  SHOW_BANNER: 'cookie-consent-show-banner',
  SHOW_SETTINGS: 'cookie-consent-show-settings',
}

// Extract domain from NEXTAUTH_URL or use default
const getDomain = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const url = process.env.NEXTAUTH_URL ?? 'dotabod.com'
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.hostname
    } catch (e) {
      console.error('Error extracting domain:', e)
      return 'dotabod.com'
    }
  }
  return 'dotabod.com'
}

// Helper functions for cookie management
const setCookie = (
  name: string,
  value: string,
  options: { expires?: number; path?: string } = {},
): void => {
  if (typeof window === 'undefined') return

  const { expires = 365, path = '/' } = options

  // Calculate expiry date
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + expires)

  // Set the cookie
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expiryDate.toUTCString()};path=${path};`
}

const getCookie = (name: string): string | undefined => {
  if (typeof window === 'undefined') return undefined

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=')
    if (cookieName === name) {
      return decodeURIComponent(cookieValue)
    }
  }
  return undefined
}

const getAllCookies = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}

  const result: Record<string, string> = {}
  const cookies = document.cookie.split(';')

  for (const cookie of cookies) {
    if (cookie.trim()) {
      const [name, value] = cookie.trim().split('=')
      result[name] = decodeURIComponent(value)
    }
  }

  return result
}

const removeCookie = (name: string, path = '/', domain?: string): void => {
  if (typeof window === 'undefined') return

  // Try different combinations of paths and domains to ensure the cookie is removed
  const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'

  if (domain) {
    document.cookie = `${name}=; ${expires}; path=${path}; domain=${domain};`
  } else {
    // Without specifying domain
    document.cookie = `${name}=; ${expires}; path=${path};`

    // Also try with current domain
    const currentDomain = window.location.hostname
    document.cookie = `${name}=; ${expires}; path=${path}; domain=${currentDomain};`

    // Also try with root domain (for subdomains)
    if (currentDomain.split('.').length > 2) {
      const rootDomain = currentDomain.split('.').slice(-2).join('.')
      document.cookie = `${name}=; ${expires}; path=${path}; domain=.${rootDomain};`
    }
  }

  // Also try with different paths
  document.cookie = `${name}=; ${expires}; path=/;`
}

// Initialize third-party scripts based on cookie preferences
const initializeThirdPartyScripts = (prefs: CookiePreferences): void => {
  if (typeof window === 'undefined') return

  // Only initialize scripts if we have explicit consent
  // First, save the preferences to cookie and localStorage
  setCookie(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs), { expires: 365 })
  localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs))

  // Store the timestamp when preferences were last updated
  localStorage.setItem('cookie_preferences_updated', Date.now().toString())

  // Set Google Analytics consent mode
  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: prefs.analytics ? 'granted' : 'denied',
      ad_storage: prefs.marketing ? 'granted' : 'denied',
      functionality_storage: prefs.necessary ? 'granted' : 'denied',
      personalization_storage: prefs.preferences ? 'granted' : 'denied',
    })
  }

  // Set HubSpot consent for tracking (but allow chat functionality)
  if (window.HubSpotConsentConfig) {
    window.HubSpotConsentConfig.setTrackingCookiesAllowed(prefs.marketing)
  }

  // If HubSpot tracking is disabled but the script is loaded, set doNotTrack
  if (!prefs.marketing && window._hsq) {
    window._hsq.push(['doNotTrack', true])
  }

  // Set flags to indicate enabled/disabled state
  window._ga_enabled = prefs.analytics
  window._hubspot_enabled = prefs.marketing

  // Dispatch event for other components to react to consent changes
  const event = new Event('consentUpdate')
  window.dispatchEvent(event)
}

// Hook for accessing and updating cookie preferences
export const useCookiePreferences = () => {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  })

  const [loaded, setLoaded] = useState(false)
  const [hasConsented, setHasConsented] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    const savedPreferences = getCookie(COOKIE_PREFERENCES_KEY)

    if (savedPreferences) {
      try {
        const parsedPreferences = JSON.parse(savedPreferences) as CookiePreferences
        setPreferences(parsedPreferences)
        setHasConsented(true) // If we have saved preferences, user has consented

        // If we don't have a timestamp for when preferences were updated, set it now
        if (!localStorage.getItem('cookie_preferences_updated')) {
          localStorage.setItem('cookie_preferences_updated', Date.now().toString())
        }
      } catch (e) {
        console.error('Error parsing saved cookie preferences', e)
      }
    }

    setLoaded(true)
  }, [])

  const updatePreferences = useCallback((newPreferences: CookiePreferences) => {
    // Update state
    setPreferences(newPreferences)
    setHasConsented(true) // User has explicitly set preferences

    // Apply the preferences (this will also save to cookie and localStorage)
    applyPreferences(newPreferences)
  }, [])

  return {
    preferences,
    updatePreferences,
    loaded,
    hasConsented,
  }
}

// Apply cookie preferences by removing disallowed cookies
const applyPreferences = (prefs: CookiePreferences): void => {
  if (typeof window === 'undefined') return

  // First, initialize third-party scripts with the current preferences
  initializeThirdPartyScripts(prefs)

  // Then, remove any cookies that shouldn't be there based on preferences

  // Handle Google Analytics
  if (!prefs.analytics) {
    const allCookies = getAllCookies()
    for (const cookieName of Object.keys(allCookies)) {
      if (cookieName === '_ga' || cookieName.startsWith('_ga_')) {
        removeCookie(cookieName)
        removeCookie(cookieName, '/', getDomain())
        removeCookie(cookieName, '/', 'localhost')
      }
    }
  }

  // Handle HubSpot - only remove tracking cookies, keep chat functionality
  if (!prefs.marketing) {
    const allCookies = getAllCookies()

    // List of HubSpot tracking cookies to remove
    const trackingCookies = [
      'hubspotutk', // Main tracking cookie for visitor identification
      '__hstc', // Main tracking cookie
      '__hssc', // Session cookie
      '__hssrc', // Session cookie
    ]

    // List of cookie prefixes to check
    const trackingPrefixes = [
      '__hs_opt_out', // Opt-out cookie
      '__hs_do_not_track', // Do not track cookie
      '__hs_initial_opt_in', // Initial opt-in cookie
    ]

    for (const cookieName of Object.keys(allCookies)) {
      // Check if it's a tracking cookie (but not a chat cookie)
      const isTrackingCookie =
        trackingCookies.includes(cookieName) ||
        trackingPrefixes.some((prefix) => cookieName.startsWith(prefix)) ||
        (cookieName.includes('hubspot') && !cookieName.includes('chat'))

      // Don't remove chat-related cookies
      const isChatCookie =
        cookieName.includes('hs-messages') ||
        cookieName.includes('messagesUtk') ||
        cookieName.includes('hs-chat')

      if (isTrackingCookie && !isChatCookie) {
        removeCookie(cookieName)
        removeCookie(cookieName, '/', getDomain())
        removeCookie(cookieName, '/', 'localhost')

        // Also try to remove from .domain.com (with leading dot)
        const domain = getDomain()
        if (domain && !domain.startsWith('.')) {
          removeCookie(cookieName, '/', `.${domain}`)
        }
      }
    }

    // If HubSpot is loaded, try to disable tracking but keep chat
    if (window.HubSpotConsentConfig) {
      window.HubSpotConsentConfig.setTrackingCookiesAllowed(false)
    }

    // Tell HubSpot not to track this user
    if (window._hsq) {
      window._hsq.push(['doNotTrack', true])
    }
  }

  // Handle preference cookies
  if (!prefs.preferences) {
    const allCookies = getAllCookies()
    for (const cookieName of Object.keys(allCookies)) {
      if (cookieName.includes('preferences') || cookieName.includes('hs-messages')) {
        removeCookie(cookieName)
        removeCookie(cookieName, '/', getDomain())
        removeCookie(cookieName, '/', 'localhost')
      }
    }
  }
}

// Function to trigger cookie consent banner
export const showCookieConsentBanner = (): void => {
  if (typeof window !== 'undefined') {
    const event = new Event(COOKIE_EVENTS.SHOW_BANNER)
    window.dispatchEvent(event)
  }
}

// Function to trigger cookie consent settings
export const showCookieConsentSettings = (): void => {
  if (typeof window !== 'undefined') {
    const event = new Event(COOKIE_EVENTS.SHOW_SETTINGS)
    window.dispatchEvent(event)
  }
}

// Define window with our custom properties
declare global {
  interface Window {
    _ga_enabled?: boolean
    _hubspot_enabled?: boolean
    // eslint-disable-next-line @typescript-eslint/ban-types
    dataLayer?: Array<Object>
    gtag?: (command: string, ...args: Array<unknown>) => void
    HubSpotConsentConfig?: {
      setTrackingCookiesAllowed: (allowed: boolean) => void
    }
  }
}
