import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeatureList } from '@/components/Plan'

describe('FeatureList', () => {
  it('renders provided features', () => {
    const features = ['One', 'Two']
    render(<FeatureList features={features} featured={false} payWithCrypto={false} />)

    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
  })
})
