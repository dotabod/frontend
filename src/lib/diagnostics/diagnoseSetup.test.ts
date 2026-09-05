import { describe, expect, it } from 'vitest'
import { diagnoseSetup, isCompleteDiagnosticPayload } from './diagnoseSetup'

const now = new Date('2026-09-04T12:00:00.000Z').getTime()
const recent = '2026-09-04T11:59:30.000Z'

describe('diagnoseSetup', () => {
  it('rejects a response truncated near the Cloudflare throttling boundary', () => {
    expect(isCompleteDiagnosticPayload(16 * 1024)).toBe(false)
    expect(isCompleteDiagnosticPayload(64 * 1024)).toBe(true)
  })

  it('reports a healthy setup when the OBS socket and Dota GSI are recent', () => {
    expect(
      diagnoseSetup({
        browserProbe: 'passed',
        gsiLastSeenAt: recent,
        now,
        overlayPageLastSeenAt: recent,
        overlaySocketLastSeenAt: recent,
      }).code,
    ).toBe('healthy')
  })

  it('identifies a browser network failure before interpreting OBS signals', () => {
    expect(
      diagnoseSetup({
        browserProbe: 'failed',
        gsiLastSeenAt: null,
        now,
        overlayPageLastSeenAt: null,
        overlaySocketLastSeenAt: null,
      }).code,
    ).toBe('browser_blocked')
  })

  it('flags a likely browser-only VPN when the browser works but OBS never reaches the page', () => {
    expect(
      diagnoseSetup({
        browserProbe: 'passed',
        gsiLastSeenAt: null,
        now,
        overlayPageLastSeenAt: null,
        overlaySocketLastSeenAt: null,
      }).code,
    ).toBe('obs_page_missing')
  })

  it('distinguishes an OBS live-server failure from an overlay page failure', () => {
    expect(
      diagnoseSetup({
        browserProbe: 'passed',
        gsiLastSeenAt: recent,
        now,
        overlayPageLastSeenAt: recent,
        overlaySocketLastSeenAt: null,
      }).code,
    ).toBe('obs_socket_missing')
  })

  it('identifies missing Dota game-state data after OBS connects', () => {
    expect(
      diagnoseSetup({
        browserProbe: 'passed',
        gsiLastSeenAt: null,
        now,
        overlayPageLastSeenAt: recent,
        overlaySocketLastSeenAt: recent,
      }).code,
    ).toBe('gsi_missing')
  })

  it('treats timestamps older than the freshness window as stale', () => {
    expect(
      diagnoseSetup({
        browserProbe: 'passed',
        gsiLastSeenAt: '2026-09-04T11:50:00.000Z',
        now,
        overlayPageLastSeenAt: recent,
        overlaySocketLastSeenAt: recent,
      }).code,
    ).toBe('gsi_stale')
  })
})
