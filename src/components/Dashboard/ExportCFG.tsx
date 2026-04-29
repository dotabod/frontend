import { AppleOutlined, LinuxOutlined, WindowsOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import clsx from 'clsx'
import { SparklesIcon } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import UnixInstaller from '@/components/Dashboard/UnixInstaller'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import type { SetupStepProgressState } from './SetupProgressShell'
import { SetupStatusPill, SetupStepHeader, SetupStepPanel } from './SetupStepHeader'
import WindowsInstaller from './WindowsInstaller'

interface ExportCFGProps {
  onProgressChange?: (progress: SetupStepProgressState) => void
}

type InstallMode = 'windows' | 'manual'

function ModeChip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'info' | 'success'
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
        tone === 'success'
          ? 'border-emerald-400/35 bg-emerald-500/12 text-emerald-200'
          : tone === 'info'
            ? 'border-violet-400/30 bg-violet-500/12 text-violet-200'
            : 'border-gray-700 bg-gray-900/80 text-gray-300',
      )}
    >
      {children}
    </span>
  )
}

function SetupModeButton({
  badge,
  description,
  isActive,
  onClick,
  title,
}: {
  badge?: React.ReactNode
  description: string
  isActive: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      className={clsx(
        'rounded-2xl border p-4 text-left transition-all duration-200',
        isActive
          ? 'border-violet-500/45 bg-violet-950/35 shadow-[0_0_0_1px_rgba(139,92,246,0.12)]'
          : 'border-gray-800 bg-gray-950/60 hover:border-gray-700 hover:bg-gray-900/70',
      )}
      onClick={onClick}
      type='button'
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-sm font-semibold text-white'>{title}</p>
            {badge}
          </div>
          <p className='mt-2 text-sm leading-relaxed text-gray-400'>{description}</p>
        </div>
        {isActive ? <SparklesIcon className='mt-0.5 h-4 w-4 text-violet-200' /> : null}
      </div>
    </button>
  )
}

function SetupModeSelector({
  automaticDescription,
  manualDescription,
  onAutomaticSelect,
  onManualSelect,
  value,
}: {
  automaticDescription: string
  manualDescription: string
  onAutomaticSelect: () => void
  onManualSelect: () => void
  value: InstallMode
}) {
  return (
    <div className='mb-5 rounded-2xl border border-gray-800/80 bg-black/20 p-2'>
      <div className='grid gap-2 lg:grid-cols-2'>
        <SetupModeButton
          badge={<ModeChip tone='info'>Windows</ModeChip>}
          description={automaticDescription}
          isActive={value === 'windows'}
          onClick={onAutomaticSelect}
          title='Automatic setup'
        />
        <SetupModeButton
          badge={<ModeChip>All platforms</ModeChip>}
          description={manualDescription}
          isActive={value === 'manual'}
          onClick={onManualSelect}
          title='Manual setup'
        />
      </div>
    </div>
  )
}

function InstallPage({ onProgressChange }: ExportCFGProps) {
  const track = useTrack()
  const [activeKey, setActiveKey] = useState<InstallMode>('windows')
  const [autoInstallerProgress, setAutoInstallerProgress] = useState<SetupStepProgressState | null>(
    null,
  )
  const router = useRouter()

  const updateUrlWithGsiType = (newGsiType: 'windows' | 'manual') => {
    setActiveKey(newGsiType)

    // Update the URL without adding a new history entry
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, gsiType: newGsiType },
      },
      undefined,
      { shallow: true },
    ) // `shallow: true` to not trigger data fetching methods again
  }

  useEffect(() => {
    const parsedStep = router.query.gsiType as string
    if (parsedStep === 'windows' || parsedStep === 'manual') {
      setActiveKey(parsedStep)
    }
  }, [router.query.gsiType])

  useEffect(() => {
    const determinePlatform = () => {
      // @ts-expect-error userAgentData is not yet in the TS types
      if (navigator.userAgentData?.platform) {
        // @ts-expect-error userAgentData is not yet in the TS types
        return navigator.userAgentData.platform.toLowerCase()
      }

      // Fallback to userAgent if userAgentData is not available
      return navigator.userAgent.toLowerCase()
    }

    if (!router.query.gsiType) {
      const platform = determinePlatform()
      if (platform.includes('win')) {
        updateUrlWithGsiType('windows')
      } else {
        updateUrlWithGsiType('manual')
      }
    }
  }, [])

  useEffect(() => {
    if (activeKey === 'manual') {
      onProgressChange?.({
        label: 'Manual file install',
        detail: 'Place the config file in Dota 2 and restart the game when you are ready.',
        completedCount: 1,
        totalCount: 2,
        isComplete: false,
        needsAttention: false,
      })
      return
    }

    onProgressChange?.(
      autoInstallerProgress ?? {
        label: 'Ready for automatic install',
        detail: 'Run the installer command and Dotabod will verify the game sync connection.',
        completedCount: 0,
        totalCount: 2,
        isComplete: false,
        needsAttention: false,
      },
    )
  }, [activeKey, autoInstallerProgress, onProgressChange])

  return (
    <Card className='!p-0 overflow-hidden'>
      <SetupStepHeader
        step={2}
        title='Enable game sync'
        subtitle='Dotabod reads live Dota 2 data — your hero, MMR, Roshan timer, and more — to power chat commands and overlays.'
      />
      <div className='space-y-5 px-6 py-6 text-sm text-gray-300'>
        <SetupStepPanel
          eyebrow='Game sync setup'
          title='Choose how you want to install the game sync'
          description='Automatic setup is the fastest Windows path. Manual setup is always available if you want to place the Valve-approved config file yourself.'
          status={
            <SetupStatusPill tone={activeKey === 'manual' ? 'neutral' : 'info'}>
              {activeKey === 'manual' ? 'Manual file install' : 'Automatic Windows installer'}
            </SetupStatusPill>
          }
        >
          <div className='mb-4 flex flex-wrap gap-2'>
            <SetupStatusPill tone='success'>Valve-approved GSI config</SetupStatusPill>
            <SetupStatusPill tone={activeKey === 'manual' ? 'neutral' : 'info'}>
              {activeKey === 'manual' ? 'Manual path selected' : 'Automatic path selected'}
            </SetupStatusPill>
            <SetupStatusPill tone='neutral'>No premium gate on this step</SetupStatusPill>
          </div>

          <SetupModeSelector
            automaticDescription='Use the Windows installer to place the config for you and verify that Dotabod can see the game sync connection.'
            manualDescription='Download the config file yourself and drop it into the correct Dota 2 folder on Windows, macOS, or Linux.'
            onAutomaticSelect={() => {
              updateUrlWithGsiType('windows')
              track('install_type/click', { label: 'windows' })
            }}
            onManualSelect={() => {
              updateUrlWithGsiType('manual')
              track('install_type/click', { label: 'manual' })
            }}
            value={activeKey}
          />

          {activeKey === 'manual' ? (
            <div className='space-y-4'>
              <div className='rounded-xl border border-dashed border-gray-700 bg-gray-900/60 p-4 text-sm text-gray-400'>
                You&apos;re using the manual file install path right now. That&apos;s perfect for
                macOS, Linux, or anyone who prefers to place the config file themselves.
                <div className='mt-3'>
                  <Button
                    icon={<WindowsOutlined />}
                    onClick={() => {
                      updateUrlWithGsiType('windows')
                      track('install_type/click', { label: 'windows' })
                    }}
                  >
                    Switch to automatic Windows install
                  </Button>
                </div>
              </div>

              <UnixInstaller />
            </div>
          ) : (
            <WindowsInstaller onProgressChange={setAutoInstallerProgress} />
          )}

          {activeKey === 'windows' ? (
            <div className='mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-gray-800 bg-gray-950/50 px-4 py-3 text-sm text-gray-400'>
              <span>
                If you&apos;re not on Windows or you just prefer to do it yourself, switch to
              </span>
              <button
                className='inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs font-medium text-gray-200 transition-colors hover:border-gray-600 hover:text-white'
                onClick={() => {
                  updateUrlWithGsiType('manual')
                  track('install_type/click', { label: 'manual' })
                }}
                type='button'
              >
                <AppleOutlined /> <LinuxOutlined /> Manual setup
              </button>
            </div>
          ) : null}
        </SetupStepPanel>
      </div>
    </Card>
  )
}

export default InstallPage
