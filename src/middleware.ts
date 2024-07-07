// middleware.ts

import { get } from '@vercel/edge-config'
import { withAuth } from 'next-auth/middleware'
import type { NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export const config = {
  matcher: [
    '/',
    '/install',
    '/login',
    '/overlay/:path*',
    '/api/:path*',
    '/dashboard/:path*',
  ],
}

export async function middleware(req: NextRequestWithAuth) {
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
    // show the default page if EDGE_CONFIG env var is missing,
    // but log the error to the console
    console.error(error)
  }
  if (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/install')
  ) {
    // Proceed with the authentication middleware for /dashboard paths
    return withAuth(req)
  }

  return NextResponse.next()
}
