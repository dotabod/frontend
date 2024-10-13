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
  let userId = session?.user?.id
  if (session?.user?.isImpersonating) {
    const decryptedId = await decode({
      token: session?.user?.id,
      secret: process.env.NEXTAUTH_SECRET,
    })
    userId = decryptedId.id
  }

  if (!userId) {
    throw new Error('No user ID found in session')
  }

  return { ...session, user: { ...session.user, id: userId } }
}
