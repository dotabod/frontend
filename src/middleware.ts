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
    '/overlay/:path*',
    '/api/:path*',
    '/dashboard/:path*',
    '/install',
  ],
}

export async function middleware(req: NextRequestWithAuth) {
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
    if (isInMaintenanceMode) {
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
  if (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.endsWith('/overlay')
  ) {
    // Proceed with the authentication middleware for /dashboard paths
    return withAuth(req)
  }

  return NextResponse.next()
}
