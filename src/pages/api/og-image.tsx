import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'

export const config = {
  runtime: 'edge',
}
// Using a regular otf font instead of WOFF2 to avoid "Unsupported OpenType signature wOF2" error
const font = fetch(new URL('./Inter-Regular.otf', import.meta.url)).then((res) => res.arrayBuffer())

export default async function handler(req: NextRequest) {
  const fontData = await font
  const { searchParams } = new URL(req.url)
  const host = req.headers.get('host')

  // Extract parameters
  const pageType = searchParams.get('type') || 'default'
  const title = searchParams.get('title') || ''
  const subtitle = searchParams.get('subtitle') || ''
  const username = searchParams.get('username') || ''

  try {
    // Base layout and styling shared across all templates
    const baseLayout = (children: React.ReactNode) => (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1f2937',
          position: 'relative',
        }}
      >
        {/* Background with gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom right, #1f2937, #111827)',
            opacity: 0.9,
            zIndex: 1,
          }}
        />

        {/* Pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'radial-gradient(#4B5563 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            opacity: 0.1,
            zIndex: 2,
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            zIndex: 10,
            padding: '40px',
          }}
        >
          {/* Use welcome.png as the logo */}
          <div style={{ display: 'flex', marginBottom: 48, alignItems: 'center' }}>
            <img
              src={`${host?.includes('localhost') ? 'http' : 'https'}://${host}/dotabod.svg`}
              alt='Dotabod Logo'
              width={180}
              height={180}
            />
            <span
              style={{
                fontSize: 68,
                fontWeight: 'bold',
                color: 'white',
                marginLeft: 20,
              }}
            >
              Dotabod
            </span>
          </div>

          {/* Template-specific content */}
          {children}

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              fontSize: 24,
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 500,
              zIndex: 10,
            }}
          >
            dotabod.com
          </div>
        </div>
      </div>
    )

    // Choose template based on page type
    let content: React.ReactNode

    switch (pageType) {
      case 'profile':
        // Template for user profiles ([username].tsx)
        content = (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <h1
              style={{
                fontSize: 64,
                color: 'white',
                margin: 0,
                marginBottom: 24,
                textShadow: '0px 4px 4px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
              }}
            >
              {username}
            </h1>
            <h2
              style={{
                fontSize: 32,
                color: '#9CA3AF',
                margin: 0,
                textAlign: 'center',
                maxWidth: '80%',
                textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              Dota 2 Commands & Settings
            </h2>
          </div>
        )
        break

      case 'verify':
        // Template for verification page
        content = (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <h1
              style={{
                fontSize: 64,
                color: 'white',
                margin: 0,
                marginBottom: 24,
                textShadow: '0px 4px 4px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
              }}
            >
              Get Dotabod Verified
            </h1>
            <h2
              style={{
                fontSize: 32,
                color: '#9CA3AF',
                margin: 0,
                textAlign: 'center',
                maxWidth: '80%',
                textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              Link your Steam account to become Dotabod Verified
            </h2>
          </div>
        )
        break

      default:
        // Generic template that uses title and subtitle parameters
        content = (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <h1
              style={{
                fontSize: 64,
                color: 'white',
                margin: 0,
                marginBottom: 24,
                textShadow: '0px 4px 4px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
              }}
            >
              {title || 'Dotabod'}
            </h1>
            <h2
              style={{
                fontSize: 32,
                color: '#9CA3AF',
                margin: 0,
                textAlign: 'center',
                maxWidth: '80%',
                textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              {subtitle || 'Enhance Your Dota 2 Streaming Experience'}
            </h2>
          </div>
        )
    }

    return new ImageResponse(baseLayout(content), {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
    })
  } catch (error) {
    console.error(error)
    return new Response('Failed to generate image', { status: 500 })
  }
}
