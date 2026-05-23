import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'

export interface SetupModStatusResponse {
  modded: boolean
  reason?: 'no_twitch_token' | 'check_failed'
}

const POLL_WHEN_UNVERIFIED_MS = 15_000
const POLL_WHEN_VERIFIED_MS = 60_000

export const useSetupModStatus = () =>
  useSWR<SetupModStatusResponse>('/api/setup/mod-status', fetcher, {
    ...SETTINGS_SWR_OPTIONS,
    // Keep polling once verified so we catch unmod events; the backend has its own
    // Helix rate-limit cache so this stays cheap. Stopping entirely would leave the
    // Dashboard showing "verified" indefinitely after a real unmod.
    refreshInterval: (latest) => (latest?.modded ? POLL_WHEN_VERIFIED_MS : POLL_WHEN_UNVERIFIED_MS),
  })
