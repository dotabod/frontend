import type { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

interface DashboardAccessOptions {
  requireAdmin?: boolean
}

export const requireDashboardAccess =
  (options: DashboardAccessOptions = {}): GetServerSideProps =>
  async (context: GetServerSidePropsContext) => {
    const session = await getServerSession(context.req, context.res, authOptions)

    if (!session) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      }
    }

    // Ban gate. The jwt() callback already throws ACCOUNT_BANNED at signin,
    // but NextAuth's JWT strategy means a banned user with a live cookie
    // keeps it until the cookie expires. Re-checking on every dashboard
    // navigation closes that window. One DB round-trip per dashboard page
    // load — acceptable: dashboards are not high-RPS for any single user.
    if (session.user?.id) {
      const u = await prisma.user.findUnique({
        select: { bannedAt: true },
        where: { id: session.user.id },
      })
      if (u?.bannedAt) {
        return {
          redirect: {
            destination: '/error?error=ACCOUNT_BANNED',
            permanent: false,
          },
        }
      }
    }

    if (session.user?.role === 'chatter') {
      return {
        redirect: {
          destination: '/verify?error=chatter',
          permanent: false,
        },
      }
    }

    if (options.requireAdmin && !session.user?.role?.includes('admin')) {
      return {
        redirect: {
          destination: '/404',
          permanent: false,
        },
      }
    }

    return { props: {} }
  }
