import { NextApiRequest, NextApiResponse } from 'next'

const CROWDIN_API_BASE_URL = 'https://api.crowdin.com/api/v2'
const token = process.env.CROWDIN_TOKEN

async function fetchLanguageProgress(projectId: string, languageId: string) {
  const url = `${CROWDIN_API_BASE_URL}/projects/${projectId}/languages/progress?limit=50`
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
  return data?.data
}

async function fetchProject(projectId: string) {
  const url = `${CROWDIN_API_BASE_URL}/projects/${projectId}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    console.log(await response.text())
    throw new Error(
      `Failed to fetch Crowdin project. Status: ${response.status}`
    )
  }

  const data = await response.json()
  return data?.data
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { projectId, languageId } = req.query

  try {
    const languageProgress = await fetchLanguageProgress(
      projectId as string,
      languageId as string
    )
    const project = await fetchProject(projectId as string)

    res.status(200).json({ languageProgress, project })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
