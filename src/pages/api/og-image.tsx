import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(410).json({
    error: 'OG image generation endpoint has been disabled.',
  })
}
