import axios, { AxiosHeaders } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData } from '@/lib/hooks/open-dota-api'

const originalAdapter = axios.defaults.adapter

interface OpenDotaFixture {
  dire_score?: number
  job?: {
    jobId: number
  }
  lobby_type?: number
  players?:
    | {
        assists?: number
        deaths?: number
        hero_id: number
        kills?: number
      }[]
    | null
  radiant_score?: number
  radiant_win?: boolean
  status?: string
}

const createResponse = function createResponse(
  config: InternalAxiosRequestConfig,
  data: OpenDotaFixture,
): AxiosResponse<OpenDotaFixture> {
  return {
    config,
    data,
    headers: new AxiosHeaders(),
    status: 200,
    statusText: 'OK',
  }
}

describe(getMatchData, () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    axios.defaults.adapter = originalAdapter
  })

  it('shares an in-flight match request while returning stats for each requested hero', async () => {
    const matchResponse = Promise.withResolvers<AxiosResponse<OpenDotaFixture>>()
    const adapter = vi.fn<AxiosAdapter>(async () => await matchResponse.promise)
    axios.defaults.adapter = adapter

    const axeResult = getMatchData('deduplicated-match', 2)
    const baneResult = getMatchData('deduplicated-match', 3)

    expect(adapter).toHaveBeenCalledOnce()

    const [[config]] = adapter.mock.calls
    matchResponse.resolve(
      createResponse(config, {
        dire_score: 21,
        lobby_type: 7,
        players: [
          { assists: 8, deaths: 2, hero_id: 2, kills: 10 },
          { assists: 14, deaths: 5, hero_id: 3, kills: 4 },
        ],
        radiant_score: 35,
        radiant_win: true,
      }),
    )

    await expect(axeResult).resolves.toMatchObject({ assists: 8, deaths: 2, kills: 10 })
    await expect(baneResult).resolves.toMatchObject({ assists: 14, deaths: 5, kills: 4 })
  })

  it('reuses parsed match data when another hero is requested later', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      await Promise.resolve()
      return createResponse(config, {
        players: [
          { hero_id: 4, kills: 1 },
          { hero_id: 5, kills: 9 },
        ],
      })
    })
    axios.defaults.adapter = adapter

    await expect(getMatchData('cached-match', 4)).resolves.toMatchObject({ kills: 1 })
    await expect(getMatchData('cached-match', 5)).resolves.toMatchObject({ kills: 9 })

    expect(adapter).toHaveBeenCalledOnce()
  })

  it('stops after one post-parse refetch when OpenDota still returns incomplete data', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      await Promise.resolve()

      if (config.method === 'post') {
        return createResponse(config, { job: { jobId: 42 } })
      }

      if (config.url?.endsWith('/request/42') ?? false) {
        return createResponse(config, { status: 'completed' })
      }

      return createResponse(config, { players: null })
    })
    axios.defaults.adapter = adapter

    await expect(getMatchData('permanently-incomplete-match', 2)).rejects.toThrow(
      'Failed to fetch match data for permanently-incomplete-match',
    )

    const matchRequests = adapter.mock.calls.filter(
      ([config]) => config.url?.includes('/matches/permanently-incomplete-match') ?? false,
    )
    expect(matchRequests).toHaveLength(2)
    expect(adapter).toHaveBeenCalledTimes(4)
  })

  it('allows a later request after an in-flight match fetch rejects', async () => {
    const adapter = vi
      .fn<AxiosAdapter>()
      .mockRejectedValueOnce(new Error('OpenDota unavailable'))
      .mockImplementationOnce(async (config) => {
        await Promise.resolve()
        return createResponse(config, {
          players: [{ hero_id: 6, kills: 7 }],
        })
      })
    axios.defaults.adapter = adapter

    await expect(getMatchData('retry-after-failure-match', 6)).rejects.toThrow(
      'Failed to fetch match data for retry-after-failure-match',
    )
    await expect(getMatchData('retry-after-failure-match', 6)).resolves.toMatchObject({ kills: 7 })

    expect(adapter).toHaveBeenCalledTimes(2)
  })
})
