import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

const CROWDIN_API_BASE_URL = 'https://api.crowdin.com/api/v2'

async function fetchLanguageProgress(
  projectId: string,
  languageId: string,
  token: string
) {
  const url = `${CROWDIN_API_BASE_URL}/projects/${projectId}/languages/${languageId}/progress?limit=1&offset=0`
  console.log(`Fetching language progress from ${url} ...`)
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Crowdin language progress. Status: ${response.status}`
    )
  }

  const data = await response.json()
  return data.data[0].data
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { projectId, languageId } = req.query

  // Retrieve the Crowdin token from your Next.js environment
  const token = process.env.CROWDIN_TOKEN

  try {
    const languageProgress = await fetchLanguageProgress(
      projectId as string,
      languageId as string,
      token
    )

    res.status(200).json({ ...languageProgress })
  } catch (error) {
    captureException(error)
    res.status(500).json({ error: error.message })
  }
}
