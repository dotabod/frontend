import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '../Card'

describe('Card', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <div data-testid='child'>Test Content</div>
      </Card>,
    )

    const child = screen.getByTestId('child')
    expect(child).toBeInTheDocument()
    expect(child).toHaveTextContent('Test Content')
  })

  it('applies default classes', () => {
    render(
      <Card data-testid='card'>
        <div>Test Content</div>
      </Card>,
    )

    const card = screen.getByTestId('card')
    expect(card).toHaveClass('flex')
    expect(card).toHaveClass('flex-col')
    expect(card).toHaveClass('items-center')
    expect(card).toHaveClass('rounded-sm')
    expect(card).toHaveClass('bg-slate-700/50')
    expect(card).toHaveClass('p-1')
    expect(card).toHaveClass('text-white/90')
  })

  it('applies additional classes from className prop', () => {
    render(
      <Card className='custom-class' data-testid='card'>
        <div>Test Content</div>
      </Card>,
    )

    const card = screen.getByTestId('card')
    expect(card).toHaveClass('custom-class')
    // Default classes should still be applied
    expect(card).toHaveClass('flex')
    expect(card).toHaveClass('flex-col')
  })

  it('passes additional props to the div element', () => {
    render(
      <Card data-testid='card' id='custom-id' aria-label='Card component'>
        <div>Test Content</div>
      </Card>,
    )

    const card = screen.getByTestId('card')
    expect(card).toHaveAttribute('id', 'custom-id')
    expect(card).toHaveAttribute('aria-label', 'Card component')
  })
})
