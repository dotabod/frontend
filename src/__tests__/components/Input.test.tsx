import { Input } from '@/components/Input'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock the antd Input component
vi.mock('antd', () => ({
  Input: (props) => <input data-testid={props['data-testid']} {...props} />,
}))

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input data-testid='input' />)

    const input = screen.getByTestId('input')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('passes props to the input element', () => {
    render(
      <Input
        placeholder='Enter text'
        className='custom-class'
        id='test-input'
        data-testid='input'
      />,
    )

    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('placeholder', 'Enter text')
    expect(input).toHaveAttribute('class', 'custom-class')
    expect(input).toHaveAttribute('id', 'test-input')
  })

  it('handles input changes', () => {
    const handleChange = vi.fn()

    render(<Input onChange={handleChange} data-testid='input' />)

    const input = screen.getByTestId('input')
    fireEvent.change(input, { target: { value: 'test value' } })

    expect(handleChange).toHaveBeenCalled()
  })
})
