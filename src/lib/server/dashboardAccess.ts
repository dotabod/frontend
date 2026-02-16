import type { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

interface DashboardAccessOptions {
  requireAdmin?: boolean
}

export const requireDashboardAccess = (
  options: DashboardAccessOptions = {},
): GetServerSideProps => {
  return async (context: GetServerSidePropsContext) => {
    const session = await getServerSession(context.req, context.res, authOptions)

    if (!session) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
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
}
