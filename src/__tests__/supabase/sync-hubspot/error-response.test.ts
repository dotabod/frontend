import { afterEach, describe, expect, it, vi } from 'vitest'

import { internalServerErrorResponse } from '../../../../supabase/functions/sync-hubspot/error-response'

describe(internalServerErrorResponse, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs failure details without exposing them in the response', async () => {
    const error = new Error('HubSpot token private-app-secret was rejected')
    const consoleError = vi.spyOn(console, 'error').mockReturnValue()
    const response = internalServerErrorResponse(error)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toStrictEqual({ error: 'Internal server error' })
    expect(consoleError).toHaveBeenCalledWith('sync-hubspot fatal', error)
  })
})
