import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock the framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Mock any other dependencies as needed
vi.mock('@/lib/hooks/useTransformRes', () => ({
  useTransformRes: () => (params: Record<string, unknown>) => params,
}))
