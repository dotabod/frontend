import { getNextAuthOptions } from '@/lib/auth'
import { NextApiRequest, NextApiResponse } from 'next'
import NextAuth from 'next-auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, getNextAuthOptions(req, res))
}
