import type { NextApiRequest, NextApiResponse } from 'next'
import {
  type AuthOptions,
  type Session,
  getServerSession as getNextServerSession,
} from 'next-auth'
import { decode } from 'next-auth/jwt'

export const getServerSession = async (
  ...args: [NextApiRequest, NextApiResponse, AuthOptions]
) => {
  const session: Session = await getNextServerSession(...args)
  let authenticatedUserId = session?.user?.id
  if (session?.user?.isImpersonating) {
    const decryptedId = await decode({
      token: session?.user?.id,
      secret: process.env.NEXTAUTH_SECRET,
    })
    authenticatedUserId = decryptedId.id
  }

  if (!authenticatedUserId) {
    return null
  }

  return {
    ...session,
    user: { ...session.user, id: authenticatedUserId },
  }
}
