// middleware.ts

import { captureException } from '@sentry/nextjs'
import { get } from '@vercel/edge-config'
import type { NextRequestWithAuth } from 'next-auth/middleware'
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export const config = {
  matcher: [
    '/',
    '/login',
    '/verify',
    '/overlay/:path*',
    '/api/:path*',
    '/dashboard/:path*',
    '/dashboard/admin/:path*',
    '/install',
    '/[username]',
  ],
}

export async function middleware(req: NextRequestWithAuth) {
  // Redirect literal [username] path to login page
  if (req.nextUrl.pathname === '/[username]') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (req.nextUrl.pathname === '/install') {
    return NextResponse.redirect(new URL('/api/install', req.url))
  }

  if (!process.env.EDGE_CONFIG) {
    req.nextUrl.pathname = '/missing-edge-config'
    return NextResponse.rewrite(req.nextUrl)
  }

  try {
    // Check whether the maintenance page should be shown
    const isInMaintenanceMode = await get<boolean>('isInMaintenanceMode')

    // If is in maintenance mode, point the url pathname to the maintenance page
    if (isInMaintenanceMode && process.env.VERCEL_ENV === 'production') {
      // Check if the path starts with 'overlay' and return an empty page
      if (req.nextUrl.pathname.startsWith('/overlay')) {
        return new NextResponse(null, { status: 200 })
      }

      req.nextUrl.pathname = '/maintenance'
      return NextResponse.rewrite(req.nextUrl)
    }
  } catch (error) {
    captureException(error)
    // show the default page if EDGE_CONFIG env var is missing,
    // but log the error to the console
    console.error(error)
  }

  if (req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.endsWith('/overlay')) {
    // Use the token in the request directly to check role
    // withAuth already adds the token and user to the request
    const authResult = await withAuth(req, {
      callbacks: {
        authorized: ({ token }) => {
          // If token exists but user is a 'chatter', deny access to dashboard
          if (token?.role === 'chatter') {
            return false
          }
          // Otherwise authorize if token exists
          return !!token
        },
      },
    })

    // If authorization failed and the user is a chatter, redirect to verify with error
    if (authResult && !authResult.ok) {
      return NextResponse.redirect(new URL('/verify?error=chatter', req.url))
    }

    return authResult
  }

  return NextResponse.next()
}
