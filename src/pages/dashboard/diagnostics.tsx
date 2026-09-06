import { Alert, Button, Card, Tag } from 'antd'
import { Activity, CircleCheck, CircleX, LoaderCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import io from 'socket.io-client'
import useSWR from 'swr'

import DashboardShell from '@/components/Dashboard/DashboardShell'
import { diagnoseSetup, isCompleteDiagnosticPayload } from '@/lib/diagnostics/diagnoseSetup'
import type { BrowserProbeStatus } from '@/lib/diagnostics/diagnoseSetup'
import { fetcher } from '@/lib/fetcher'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'

interface DiagnosticStatus {
  gsiLastSeenAt: string | null
  overlayPageLastSeenAt: string | null
  overlaySocketLastSeenAt: string | null
}

const diagnosisCopy = {
  browser_blocked: {
    description:
      'This browser could not establish a stable connection to gsi.dotabod.com. Try zapret or system-wide Cloudflare WARP, then run the test again.',
    message: 'Your network appears to block Dotabod’s live server',
  },
  checking: {
    description: 'Testing the same live connection used by the overlay.',
    message: 'Checking',
  },
  gsi_missing: {
    description:
      'OBS is connected, but Dota has not sent game-state data. Start Dota and enter a hero demo. If it remains missing, reinstall the GSI config.',
    message: 'Waiting for Dota game data',
  },
  gsi_stale: {
    description:
      'Dota sent data before, but nothing arrived recently. Open Dota or test in hero demo.',
    message: 'Dota game data is stale',
  },
  healthy: {
    description: 'OBS and Dota have both reached Dotabod recently.',
    message: 'Your live setup is connected',
  },
  obs_page_missing: {
    description:
      'This browser can reach Dotabod, but the OBS browser source has not checked in recently. A browser-only VPN does not cover OBS. Open OBS and refresh the source; if needed, use zapret or system-wide WARP.',
    message: 'OBS has not loaded the overlay',
  },
  obs_socket_missing: {
    description:
      'OBS loaded the page but could not connect to gsi.dotabod.com. Use zapret or system-wide Cloudflare WARP; browser VPN extensions do not affect OBS.',
    message: 'OBS cannot reach the live server',
  },
} as const

function formatSeen(value: string | null): string {
  if (!value) {
    return 'Never'
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(
    new Date(value),
  )
}

const DiagnosticsPage = () => {
  const session = useSession()
  const [browserProbe, setBrowserProbe] = useState<BrowserProbeStatus>('idle')
  const { data, mutate } = useSWR<DiagnosticStatus>('/api/diagnostics/status', fetcher, {
    refreshInterval: 10_000,
  })

  const runProbe = useCallback(async () => {
    const token = session.data?.user?.id
    const endpoint = process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL
    if (!token || !endpoint) {
      return
    }

    setBrowserProbe('running')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort()
    }, 15_000)

    try {
      const payloadCheck = fetch(`${endpoint.replace(/\/$/, '')}/diagnostics/payload`, {
        cache: 'no-store',
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error('Payload request failed')
        }
        const payload = await response.arrayBuffer()
        if (!isCompleteDiagnosticPayload(payload.byteLength)) {
          throw new Error('Payload was truncated')
        }
      })

      const socketCheck = new Promise<void>((resolve, reject) => {
        const socket = io(endpoint, {
          auth: { client: 'setup-diagnostic', token },
          forceNew: true,
          reconnection: false,
          timeout: 12_000,
          transports: ['polling', 'websocket'],
        })
        socket.once('diagnostic-ready', () => {
          socket.disconnect()
          resolve()
        })
        socket.once('connect_error', (error) => {
          socket.disconnect()
          reject(error)
        })
      })

      await Promise.all([payloadCheck, socketCheck])
      setBrowserProbe('passed')
      void mutate()
    } catch {
      setBrowserProbe('failed')
    } finally {
      window.clearTimeout(timeout)
    }
  }, [mutate, session.data?.user?.id])

  useEffect(() => {
    void runProbe()
  }, [runProbe])

  const diagnosis = useMemo(
    () =>
      diagnoseSetup({
        browserProbe,
        gsiLastSeenAt: data?.gsiLastSeenAt ?? null,
        overlayPageLastSeenAt: data?.overlayPageLastSeenAt ?? null,
        overlaySocketLastSeenAt: data?.overlaySocketLastSeenAt ?? null,
      }),
    [browserProbe, data],
  )
  const copy = diagnosisCopy[diagnosis.code]
  const rows = [
    {
      label: 'This browser → live server',
      status:
        browserProbe === 'passed'
          ? 'Connected'
          : browserProbe === 'failed'
            ? 'Blocked'
            : 'Checking',
      value: null,
    },
    {
      label: 'OBS overlay page',
      status: data?.overlayPageLastSeenAt ? 'Reached' : 'Not seen',
      value: data?.overlayPageLastSeenAt ?? null,
    },
    {
      label: 'OBS live connection',
      status: data?.overlaySocketLastSeenAt ? 'Connected before' : 'Not seen',
      value: data?.overlaySocketLastSeenAt ?? null,
    },
    {
      label: 'Dota game-state data',
      status: data?.gsiLastSeenAt ? 'Received before' : 'Not seen',
      value: data?.gsiLastSeenAt ?? null,
    },
  ]

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <div>
        <h1 className='mb-2 flex items-center gap-3 text-2xl font-semibold'>
          <Activity /> Connection diagnostics
        </h1>
        <p className='text-gray-400'>
          See whether this browser, OBS, and Dota can reach the services they need.
        </p>
      </div>
      <Alert
        showIcon
        type={diagnosis.severity}
        message={copy.message}
        description={copy.description}
      />
      <Card
        title='Live checks'
        extra={
          <Button loading={browserProbe === 'running'} onClick={() => void runProbe()}>
            Run again
          </Button>
        }
      >
        <div className='divide-y divide-white/10'>
          {rows.map((row, index) => {
            const pending = index === 0 && (browserProbe === 'idle' || browserProbe === 'running')
            const failed = index === 0 ? browserProbe === 'failed' : !row.value
            const Icon = pending ? LoaderCircle : failed ? CircleX : CircleCheck
            return (
              <div
                className='flex flex-wrap items-center justify-between gap-3 py-4'
                key={row.label}
              >
                <div className='flex items-center gap-3'>
                  <Icon
                    className={
                      pending
                        ? 'animate-spin text-blue-400'
                        : failed
                          ? 'text-red-400'
                          : 'text-green-400'
                    }
                    size={20}
                  />
                  <span>{row.label}</span>
                </div>
                <div className='text-right'>
                  <Tag color={failed ? 'red' : pending ? 'blue' : 'green'}>{row.status}</Tag>
                  {index > 0 && (
                    <div className='mt-1 text-xs text-gray-500'>{formatSeen(row.value)}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
      <Alert
        type='info'
        message='Browser VPNs do not cover OBS or Dota'
        description='If this browser passes while OBS or Dota remains missing, use a system-wide connection. zapret can target Dotabod without routing your Dota match through a VPN; Cloudflare WARP is simpler but may affect game latency.'
      />
    </div>
  )
}

DiagnosticsPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell seo={{ noindex: true, title: 'Connection diagnostics | Dotabod' }}>
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess()
export default DiagnosticsPage
