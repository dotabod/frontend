import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'

export type SetupModStatusResponse = {
  modded: boolean
  reason?: 'no_twitch_token' | 'check_failed'
}

const POLL_WHEN_UNVERIFIED_MS = 15000
const POLL_WHEN_VERIFIED_MS = 60000

export const useSetupModStatus = () =>
  useSWR<SetupModStatusResponse>('/api/setup/mod-status', fetcher, {
    ...SETTINGS_SWR_OPTIONS,
    // Keep polling once verified so we catch unmod events; the backend has its own
    // helix rate-limit cache so this stays cheap. Stopping entirely would leave the
    // dashboard showing "verified" indefinitely after a real unmod.
    refreshInterval: (latest) => (latest?.modded ? POLL_WHEN_VERIFIED_MS : POLL_WHEN_UNVERIFIED_MS),
  })
