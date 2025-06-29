import type { NextApiRequest, NextApiResponse } from 'next'
import { type AuthOptions, getServerSession as getNextServerSession, type Session } from 'next-auth'
import { decode } from 'next-auth/jwt'

export const getServerSession = async (...args: [NextApiRequest, NextApiResponse, AuthOptions]) => {
  const session: Session | null = await getNextServerSession(...args)
  if (!session) return null

  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is not set')
  }

  let authenticatedUserId: string | null = session?.user?.id
  if (session?.user?.isImpersonating) {
    const decryptedId = await decode({
      token: session?.user?.id,
      secret: process.env.NEXTAUTH_SECRET,
    })
    authenticatedUserId = decryptedId?.id ?? null
  }

  if (!authenticatedUserId) {
    return null
  }

  return {
    ...session,
    user: { ...session.user, id: authenticatedUserId },
  }
}
