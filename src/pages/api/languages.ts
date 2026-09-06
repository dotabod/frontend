import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

const CROWDIN_API_BASE_URL = 'https://api.crowdin.com/api/v2'
const CROWDIN_PATH_SEGMENT_PATTERN = /^[a-z0-9_-]+$/iu
const crowdinPathSegmentSchema = z.string().regex(CROWDIN_PATH_SEGMENT_PATTERN)
const crowdinQuerySchema = z.object({
  languageId: crowdinPathSegmentSchema,
  projectId: crowdinPathSegmentSchema,
})
const crowdinLanguageProgressResponseSchema = z.object({
  data: z.array(z.object({ data: z.record(z.string(), z.unknown()) })).min(1),
})

const encodeCrowdinPathSegment = function encodeCrowdinPathSegment(
  value: z.infer<typeof crowdinPathSegmentSchema>,
): string {
  return encodeURIComponent(value)
}

const fetchLanguageProgress = async function fetchLanguageProgress(
  projectId: string,
  languageId: string,
  token: string | undefined,
) {
  const url = `${CROWDIN_API_BASE_URL}/projects/${encodeCrowdinPathSegment(projectId)}/languages/${encodeCrowdinPathSegment(languageId)}/progress?limit=1&offset=0`
  console.log(`Fetching language progress from ${url} ...`)
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Crowdin language progress. Status: ${response.status}`)
  }

  const data = crowdinLanguageProgressResponseSchema.parse(await response.json())
  return data.data[0].data
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Retrieve the Crowdin token from your Next.js environment
  const token = process.env.CROWDIN_TOKEN

  try {
    const { projectId, languageId } = crowdinQuerySchema.parse(req.query)
    const languageProgress = await fetchLanguageProgress(projectId, languageId, token)

    res.status(200).json({ ...languageProgress })
  } catch (error) {
    captureException(error)
    res.status(500).json({ error: error.message })
  }
}
