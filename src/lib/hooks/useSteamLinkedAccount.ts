import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'

export type SteamLinkedAccountResponse = {
  linked: boolean
  primaryAccount?: {
    steam32Id: string
    profileData: { name: string; id: string }
  } | null
}

const POLL_INTERVAL_MS = 10000

export const useSteamLinkedAccount = () =>
  useSWR<SteamLinkedAccountResponse>('/api/steam/get-linked-account', fetcher, {
    ...SETTINGS_SWR_OPTIONS,
    refreshInterval: POLL_INTERVAL_MS,
  })
