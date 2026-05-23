import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getLatestPost } from '@/lib/blog'

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const latest = getLatestPost()
    const post = latest
      ? {
          date: latest.date,
          description: latest.description,
          slug: latest.slug,
          title: latest.title,
        }
      : null

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    return res.status(200).json({ post })
  } catch (error) {
    captureException(error)
    return res.status(500).end()
  }
}

export default withMethods(['GET'], handler)
