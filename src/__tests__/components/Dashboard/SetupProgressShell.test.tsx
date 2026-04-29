import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SetupProgressShell } from '@/components/Dashboard/SetupProgressShell'

const trackMock = vi.fn()

vi.mock('@/lib/track', () => ({
  useTrack: () => trackMock,
}))

describe('SetupProgressShell', () => {
  beforeEach(() => {
    trackMock.mockReset()
  })

  const steps = [
    {
      title: 'Stream',
      description: 'Connect your stream',
      progress: {
        label: 'Chat + emotes ready',
        detail: 'Dotabod can respond in chat and all required emotes are installed.',
        completedCount: 5,
        totalCount: 5,
        isComplete: true,
        needsAttention: false,
      },
    },
    {
      title: 'Dota 2',
      description: 'Configure game settings',
      progress: {
        label: 'Ready for automatic install',
        detail: 'Run the installer command and Dotabod will verify the game sync connection.',
        completedCount: 0,
        totalCount: 2,
        isComplete: false,
        needsAttention: false,
      },
    },
    { title: 'OBS', description: 'Set up your overlay' },
    { title: 'Steam', description: 'Connect your Steam account' },
  ]

  it('renders the current step summary', () => {
    render(<SetupProgressShell activeStep={1} onStepChange={vi.fn()} steps={steps} />)

    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    expect(screen.getByText('5 checks completed')).toBeInTheDocument()
    expect(screen.getAllByText('Ready for automatic install').length).toBeGreaterThan(0)
  })

  it('counts partial manual progress in the summary', () => {
    render(
      <SetupProgressShell
        activeStep={2}
        onStepChange={vi.fn()}
        steps={[
          {
            title: 'Stream',
            description: 'Connect your stream',
            progress: {
              label: 'Manual mod setup',
              detail: 'You chose the manual Twitch path.',
              completedCount: 1,
              totalCount: 2,
              isComplete: false,
              needsAttention: false,
            },
          },
          {
            title: 'Dota 2',
            description: 'Configure game settings',
            progress: {
              label: 'Manual file install',
              detail: 'You chose the manual GSI path.',
              completedCount: 1,
              totalCount: 2,
              isComplete: false,
              needsAttention: false,
            },
          },
          {
            title: 'OBS',
            description: 'Set up your overlay',
            progress: {
              label: 'Manual overlay setup',
              detail: 'You chose the manual OBS path.',
              completedCount: 1,
              totalCount: 2,
              isComplete: false,
              needsAttention: false,
            },
          },
          { title: 'Steam', description: 'Connect your Steam account' },
        ]}
      />,
    )

    expect(screen.getByText('3 checks completed')).toBeInTheDocument()
  })

  it('changes step when a step button is clicked', () => {
    const onStepChange = vi.fn()

    render(<SetupProgressShell activeStep={0} onStepChange={onStepChange} steps={steps} />)

    fireEvent.click(screen.getAllByRole('button', { name: /dota 2/i })[0])

    expect(onStepChange).toHaveBeenCalledWith(1)
    expect(trackMock).toHaveBeenCalledWith('setup/progress_step_clicked', { from: 0, to: 1 })
  })

  it('highlights the finale when the user reaches the last step', () => {
    render(<SetupProgressShell activeStep={3} onStepChange={vi.fn()} steps={steps} />)

    expect(screen.getByText('Final step')).toBeInTheDocument()
    expect(screen.getByText('Final step — connect Steam')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Everything else is in place. One quick in-game check links Steam and activates full match tracking.',
      ),
    ).toBeInTheDocument()
  })

  it('renders the premium completion state when setup is complete', () => {
    render(
      <SetupProgressShell
        activeStep={3}
        isSetupComplete
        onStepChange={vi.fn()}
        steps={steps.map((step) => ({
          ...step,
          progress: {
            label: `${step.title} ready`,
            detail: `${step.title} is configured and ready to use.`,
            completedCount: 1,
            totalCount: 1,
            isComplete: true,
            needsAttention: false,
          },
        }))}
      />,
    )

    expect(screen.getByText('Setup complete')).toBeInTheDocument()
    expect(screen.getByText('All systems ready')).toBeInTheDocument()
    expect(screen.getByText('Ready to explore')).toBeInTheDocument()
  })
})
