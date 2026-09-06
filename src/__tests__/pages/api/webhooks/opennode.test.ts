import { formatWithOptions } from 'node:util'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getDuplicateOpenNodeWebhookAt,
  logOpenNodePaymentFailure,
} from '@/pages/api/webhooks/opennode'

vi.hoisted(() => {
  vi.stubEnv('OPENNODE_API_KEY', 'test-api-key')
})

describe(logOpenNodePaymentFailure, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a percent-bearing charge ID literally', () => {
    // This fails if chargeId is interpolated into console.error's format string.
    const error = new Error('payment database offline')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    logOpenNodePaymentFailure('%s', error)

    const [logArguments] = consoleError.mock.calls
    expect(logArguments).toBeDefined()
    const output = formatWithOptions({}, ...logArguments)

    expect(output).toContain("chargeId: '%s'")
    expect(output).toContain('Error: payment database offline')
  })

  it('skips repeated confirmed events only after their payment succeeded', () => {
    const lastWebhookAt = new Date('2026-09-05T00:00:00.000Z')
    const existingCharge = { lastWebhookAt, status: 'confirmed' }

    expect(
      getDuplicateOpenNodeWebhookAt({
        alreadyProcessedSuccessfully: false,
        existingCharge,
        status: 'confirmed',
      }),
    ).toBeNull()
    expect(
      getDuplicateOpenNodeWebhookAt({
        alreadyProcessedSuccessfully: true,
        existingCharge,
        status: 'confirmed',
      }),
    ).toBe(lastWebhookAt)
  })
})
