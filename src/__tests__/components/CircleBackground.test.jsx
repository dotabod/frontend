import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CircleBackground } from '@/components/CircleBackground'

// Mock useId to return a consistent ID for testing
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useId: () => 'test-id',
  }
})

describe('CircleBackground', () => {
  it('renders an SVG element with correct attributes', () => {
    render(<CircleBackground color='#123456' data-testid='circle-bg' />)

    const svg = screen.getByTestId('circle-bg')
    expect(svg).toBeInTheDocument()
    expect(svg.tagName).toBe('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 558 558')
    expect(svg).toHaveAttribute('width', '558')
    expect(svg).toHaveAttribute('height', '558')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses the provided color for gradient and stroke', () => {
    render(<CircleBackground color='#123456' data-testid='circle-bg' />)

    const svg = screen.getByTestId('circle-bg')
    const stopElement = svg.querySelector('stop')
    expect(stopElement).toHaveAttribute('stop-color', '#123456')

    const pathElements = svg.querySelectorAll('path')
    expect(pathElements[0]).toHaveAttribute('stroke', '#123456')
  })

  it('applies custom width and height', () => {
    render(<CircleBackground color='#123456' width={300} height={400} data-testid='circle-bg' />)

    const svg = screen.getByTestId('circle-bg')
    expect(svg).toHaveAttribute('width', '300')
    expect(svg).toHaveAttribute('height', '400')
  })

  it('passes additional props to the SVG element', () => {
    render(
      <CircleBackground
        color='#123456'
        className='custom-class'
        id='custom-id'
        data-testid='circle-bg'
      />,
    )

    const svg = screen.getByTestId('circle-bg')
    expect(svg).toHaveAttribute('class', 'custom-class')
    expect(svg).toHaveAttribute('id', 'custom-id')
  })
})
