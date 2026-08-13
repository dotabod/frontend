import { fireEvent, render, waitFor } from '@testing-library/react'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import MmrForm from '@/components/Dashboard/Features/MmrForm'
import { useUpdateAccount } from '@/lib/hooks/useUpdateSetting'

vi.mock('next/image', () => ({
  default: ({ alt = '', ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={alt} {...props} />
  ),
}))

vi.mock('swr', () => ({
  default: vi.fn(),
}))

vi.mock('@/components/Overlay/rank/MMRBadge', () => ({
  MMRBadge: () => <div data-testid='mmr-badge' />,
}))

vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  SETTINGS_SWR_OPTIONS: {},
  STABLE_SWR_OPTIONS: {},
  useUpdateAccount: vi.fn(),
  useUpdateSetting: () => ({ data: 0, loading: false, updateSetting: vi.fn() }),
}))

describe('MmrForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useSWR).mockReturnValue({ data: { data: [] } } as ReturnType<typeof useSWR>)
  })

  it('submits only editable Steam accounts', async () => {
    const update = vi.fn()
    vi.mocked(useUpdateAccount).mockReturnValue({
      data: {
        accounts: [
          {
            canEdit: true,
            connectedUserIds: [],
            leaderboard_rank: null,
            mmr: 5000,
            name: 'Owned account',
            steam32Id: 111,
          },
          {
            canEdit: false,
            connectedUserIds: ['owner-name'],
            leaderboard_rank: null,
            mmr: 4000,
            name: 'Linked account',
            steam32Id: 222,
          },
        ],
      },
      isSaving: false,
      loading: false,
      update,
    } as ReturnType<typeof useUpdateAccount>)

    const { container } = render(<MmrForm />)

    await waitFor(() => {
      expect(container.querySelector('[id="111-mmr"]')).not.toBeNull()
    })

    fireEvent.change(container.querySelector('[id="111-mmr"]') as HTMLInputElement, {
      target: { value: '6000' },
    })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith([
        expect.objectContaining({ canEdit: true, mmr: 6000, steam32Id: 111 }),
      ])
    })
  })
})
