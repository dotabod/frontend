import { useSession } from 'next-auth/react'
import { useSyncExternalStore } from 'react'

import { isRussianLocale } from './resolve-payment-method'

const subscribeToLanguage = function subscribeToLanguage(onChange: () => void): () => void {
  window.addEventListener('languagechange', onChange)
  return () => {
    window.removeEventListener('languagechange', onChange)
  }
}

const readLanguage = (): string => navigator.language
const readNoLanguage = (): null => null

// True for a Russian-speaking visitor who has no plan yet, whose card checkout would
// Most likely be declined.
export const useCardsLikelyDeclined = function useCardsLikelyDeclined(
  hasActivePlan: boolean,
): boolean {
  const { data: session } = useSession()
  // The server render has no navigator, so the browser language joins after hydration.
  const browserLanguage = useSyncExternalStore(subscribeToLanguage, readLanguage, readNoLanguage)
  return !hasActivePlan && isRussianLocale(session?.user?.locale, browserLanguage)
}
