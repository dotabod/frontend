import prisma from '@/lib/db'

export async function getTwitchTokens(userId: string) {
  try {
    const user = await prisma.user.findFirstOrThrow({
      select: {
        id: true,
        name: true,
        Account: {
          select: {
            providerAccountId: true,
            access_token: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        id: userId,
      },
    })

    if (!user.Account?.providerAccountId) {
      return { message: 'No provider account ID found' }
    }

    return {
      providerAccountId: user.Account.providerAccountId,
      accessToken: user.Account.access_token,
    }
  } catch (error) {
    console.error('Failed to get info:', error)
    return { message: 'Failed to get info', error: error.message }
  }
}
