export type BrowserProbeStatus = 'idle' | 'running' | 'passed' | 'failed'

export type SetupDiagnosisCode =
  | 'checking'
  | 'healthy'
  | 'browser_blocked'
  | 'obs_page_missing'
  | 'obs_socket_missing'
  | 'gsi_missing'
  | 'gsi_stale'

interface DiagnoseSetupInput {
  browserProbe: BrowserProbeStatus
  gsiLastSeenAt: string | null
  overlayPageLastSeenAt: string | null
  overlaySocketLastSeenAt: string | null
  now?: number
}

export interface SetupDiagnosis {
  code: SetupDiagnosisCode
  severity: 'success' | 'info' | 'warning' | 'error'
}

const FRESH_MS = 2 * 60 * 1000
const DIAGNOSTIC_PAYLOAD_BYTES = 64 * 1024

export function isCompleteDiagnosticPayload(byteLength: number): boolean {
  return byteLength === DIAGNOSTIC_PAYLOAD_BYTES
}

function isFresh(timestamp: string | null, now: number): boolean {
  if (!timestamp) return false
  const parsed = Date.parse(timestamp)
  return Number.isFinite(parsed) && now - parsed <= FRESH_MS
}

export function diagnoseSetup({
  browserProbe,
  gsiLastSeenAt,
  overlayPageLastSeenAt,
  overlaySocketLastSeenAt,
  now = Date.now(),
}: DiagnoseSetupInput): SetupDiagnosis {
  if (browserProbe === 'idle' || browserProbe === 'running') {
    return { code: 'checking', severity: 'info' }
  }
  if (browserProbe === 'failed') {
    return { code: 'browser_blocked', severity: 'error' }
  }

  const overlayPageFresh = isFresh(overlayPageLastSeenAt, now)
  const overlaySocketFresh = isFresh(overlaySocketLastSeenAt, now)
  const gsiFresh = isFresh(gsiLastSeenAt, now)

  if (!overlayPageLastSeenAt) return { code: 'obs_page_missing', severity: 'warning' }
  if (!overlayPageFresh) return { code: 'obs_page_missing', severity: 'warning' }
  if (!overlaySocketFresh) return { code: 'obs_socket_missing', severity: 'error' }
  if (!gsiLastSeenAt) return { code: 'gsi_missing', severity: 'warning' }
  if (!gsiFresh) return { code: 'gsi_stale', severity: 'warning' }

  return { code: 'healthy', severity: 'success' }
}
