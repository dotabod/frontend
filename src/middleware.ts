// middleware.ts

import { captureException } from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import type { NextRequestWithAuth } from 'next-auth/middleware'
import { withAuth } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/',
    '/login',
    '/verify',
    '/overlay/:path*',
    '/dashboard/:path*',
    '/dashboard/admin/:path*',
    '/install',
    '/:username',
  ],
}

export async function middleware(req: NextRequestWithAuth) {
  const pathname = req.nextUrl.pathname
  const isMaintenanceMode = process.env.IS_IN_MAINTENANCE_MODE === 'true'

  // Redirect literal [username] path to login page
  if (pathname === '/[username]') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname === '/install') {
    return NextResponse.redirect(new URL('/api/install', req.url))
  }

  if (pathname === '/dashboard/troubleshoot') {
    return NextResponse.redirect(new URL('/dashboard/help', req.url))
  }

  const shouldCheckMaintenance =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/verify' ||
    pathname === '/install' ||
    pathname === '/[username]' ||
    pathname.startsWith('/overlay')

  if (shouldCheckMaintenance) {
    if (process.env.VERCEL_ENV !== 'production') {
      return NextResponse.next()
    }

    try {
      // If is in maintenance mode, point the url pathname to the maintenance page
      if (isMaintenanceMode) {
        // Check if the path starts with 'overlay' and return an empty page
        if (pathname.startsWith('/overlay')) {
          return new NextResponse(null, { status: 200 })
        }

        req.nextUrl.pathname = '/maintenance'
        return NextResponse.rewrite(req.nextUrl)
      }
    } catch (error) {
      captureException(error)
      console.error(error)
    }
  }

  if (pathname.startsWith('/dashboard') || pathname.endsWith('/overlay')) {
    // Use the token in the request directly to check role
    // withAuth already adds the token and user to the request
    const onlyChatterRole = await withAuth(req, {
      callbacks: {
        authorized: ({ token }) => {
          // Only check for 'chatter' role if the token exists (user is logged in)
          if (token && token.role === 'chatter') {
            return false
          }
          // Otherwise authorize if token exists
          return true
        },
      },
    })

    // If authorization failed and the user is logged in but is a chatter, redirect to verify with error
    if (onlyChatterRole && !onlyChatterRole.ok) {
      return NextResponse.redirect(new URL('/verify?error=chatter', req.url))
    }

    // Proceed with the authentication middleware for /dashboard paths
    return withAuth(req)
  }

  return NextResponse.next()
}
