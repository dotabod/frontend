import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'

export type SetupModStatusResponse = {
  modded: boolean
  reason?: 'no_twitch_token' | 'check_failed'
}

const POLL_WHEN_UNVERIFIED_MS = 15000

export const useSetupModStatus = () =>
  useSWR<SetupModStatusResponse>('/api/setup/mod-status', fetcher, {
    ...SETTINGS_SWR_OPTIONS,
    // Stop polling once verified — mod status rarely flips back mid-session, and a refresh
    // picks up changes if it does. Saves a /min hit to Twitch helix per active dashboard.
    refreshInterval: (latest) => (latest?.modded ? 0 : POLL_WHEN_UNVERIFIED_MS),
  })
