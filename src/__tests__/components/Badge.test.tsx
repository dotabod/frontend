import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/Badge'

// Mock the useTransformRes hook
vi.mock('@/lib/hooks/useTransformRes', () => ({
  useTransformRes: () => (params: Record<string, number>) => params.w || params.h,
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // Just pass all props to the img element
    // biome-ignore lint/a11y/useAltText: <explanation>
    return <img data-testid={props['data-testid'] || 'mock-image'} {...props} />
  },
}))

describe('Badge', () => {
  it('renders correctly with image prop', () => {
    render(<Badge image='test-image.png' data-testid='badge' />)

    const image = screen.getByTestId('badge')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/images/ranks/test-image.png')
    expect(image).toHaveAttribute('alt', 'rank badge')
  })

  it('renders nothing when no image is provided', () => {
    const { container } = render(<Badge image={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('passes additional props to the Image component', () => {
    render(<Badge image='test-image.png' className='custom-class' data-testid='badge' />)

    const image = screen.getByTestId('badge')
    expect(image).toHaveAttribute('class', 'custom-class')
  })
})
