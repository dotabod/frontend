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
  // Configure region to reduce cold starts
  regions: ['iad1'],
}

export async function middleware(req: NextRequestWithAuth) {
  // Add cache headers for API responses that don't change frequently
  const response = NextResponse.next()
  
  // Add cache headers for specific API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const pathSegments = req.nextUrl.pathname.split('/')
    const apiRoute = pathSegments[2]
    
    // Cache heavily used endpoints
    if (
      ['settings', 'languages', 'getLanguageProgress', 'check-ban', 'test-emote-set'].includes(apiRoute)
    ) {
      response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=600')
    }
    
    // Cache last.fm requests longer (avoids polling overhead)
    if (apiRoute === 'lastfm') {
      response.headers.set('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
    }
    
    // Subscription status can be cached briefly
    if (apiRoute === 'subscription') {
      response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=300')
    }
  }
  
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

  return response // Return the response with cache headers instead of NextResponse.next()
}
