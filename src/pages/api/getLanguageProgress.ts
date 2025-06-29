import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

const CROWDIN_API_BASE_URL = 'https://api.crowdin.com/api/v2'
const token = process.env.CROWDIN_TOKEN
const projectId = 564471

async function getTotalUsersForLanguage(languageId: string) {
  try {
    // return a percentage of total users to users using this language
    const total = await prisma.user.count()
    const locales = await prisma.user.count({
      where: {
        locale: languageId,
      },
    })

    return { percentage: Math.round((locales / total) * 100), total: locales }
  } catch (error) {
    captureException(error)
    return { percentage: 0, total: 0 }
  }
}

async function fetchLanguageProgress(languageId: string) {
  const url = `${CROWDIN_API_BASE_URL}/projects/${projectId}/languages/progress?limit=50`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Crowdin language progress. Status: ${response.status}`)
  }

  const data = await response.json()
  return data?.data
}

async function fetchProject() {
  const url = `${CROWDIN_API_BASE_URL}/projects/${projectId}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    console.log(await response.text())
    throw new Error(`Failed to fetch Crowdin project. Status: ${response.status}`)
  }

  const data = await response.json()
  return data?.data
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { languageId } = req.query
  const session = await getServerSession(req, res, authOptions)

  if (req.method !== 'GET') {
    return res.status(500).end()
  }

  if (!session?.user?.id) {
    return res.status(500).end()
  }

  try {
    const languageProgress = await fetchLanguageProgress(languageId as string)
    const project = await fetchProject()
    const { total, percentage } = await getTotalUsersForLanguage(languageId as string)

    res.status(200).json({
      total: languageId !== 'en' ? total : undefined,
      percentage,
      languageProgress,
      project,
    })
  } catch (error) {
    captureException(error)
    res.status(500).json({ error: error.message })
  }
}

export default withMethods(['GET'], handler)
