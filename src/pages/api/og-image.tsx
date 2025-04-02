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

        {/* Background illustration (simplified) */}
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
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            zIndex: 10,
            padding: '60px',
          }}
        >
          <div style={{ display: 'flex', marginBottom: 48, alignItems: 'center' }}>
            <img
              src={`${host?.includes('localhost') ? 'http' : 'https'}://${host}/dotabod.svg`}
              alt='Dotabod Logo'
              width={180}
              height={180}
            />
            <span
              style={{
                fontSize: 88,
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
              alignItems: 'flex-start',
            }}
          >
            <h1
              style={{
                fontSize: 64,
                color: 'white',
                margin: 0,
                marginBottom: 24,
                textShadow: '0px 4px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              {username}
            </h1>
            <h2
              style={{
                fontSize: 32,
                color: '#9CA3AF',
                margin: 0,
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
              alignItems: 'flex-start',
            }}
          >
            <h1
              style={{
                fontSize: 64,
                color: 'white',
                margin: 0,
                marginBottom: 24,
                textShadow: '0px 4px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              Get Dotabod Verified
            </h1>
            <h2
              style={{
                fontSize: 32,
                color: '#9CA3AF',
                margin: 0,
                maxWidth: '80%',
                textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              Link your Steam account to become Dotabod Verified
            </h2>
          </div>
        )
        break

      case 'streamer':
        // New template for streamer homepage similar to the screenshot
        content = (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h1
                style={{
                  fontSize: 72,
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0,
                  textShadow: '0px 4px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                Welcome, streamers
              </h1>
              <img
                src={`${host?.includes('localhost') ? 'http' : 'https'}://${host}/images/emotes/peepoclap.webp`}
                width={72}
                height={72}
                alt='peepoclap'
                style={{ marginLeft: '16px' }}
              />
            </div>

            <p
              style={{
                fontSize: 28,
                color: '#9CA3AF',
                margin: 0,
                marginTop: 24,
                marginBottom: 32,
                maxWidth: '70%',
                lineHeight: 1.4,
              }}
            >
              By leveraging insights from the Dota 2 official API, Dotabod will know exactly when to
              hide sensitive streamer information or engage with your Twitch audience.
            </p>

            <div
              style={{
                display: 'flex',
                marginTop: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f43f5e',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  style={{ marginRight: '8px' }}
                >
                  <title>Home Icon</title>
                  <path
                    d='M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
                Get started
              </div>
            </div>

            {/* Placeholder for the Dota logo in a phone frame - simplified for OG image */}
            <div
              style={{
                position: 'absolute',
                right: 80,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 240,
                height: 240,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            >
              <img
                src={`${host?.includes('localhost') ? 'http' : 'https'}://${host}/dotabod.svg`}
                width={160}
                height={160}
                alt='Dotabod Logo'
              />
            </div>
          </div>
        )
        break

      default:
        // Updated default template that resembles the streamer layout but uses title and subtitle parameters
        content = (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              width: '100%',
            }}
          >
            <h1
              style={{
                fontSize: 72,
                fontWeight: 'bold',
                color: 'white',
                margin: 0,
                marginBottom: 24,
                textShadow: '0px 4px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              {title || 'Dotabod'}
            </h1>
            <p
              style={{
                fontSize: 28,
                color: '#9CA3AF',
                margin: 0,
                marginTop: 24,
                marginBottom: 32,
                maxWidth: '70%',
                lineHeight: 1.4,
              }}
            >
              {subtitle || 'Enhance Your Dota 2 Streaming Experience'}
            </p>

            <div
              style={{
                display: 'flex',
                marginTop: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f43f5e',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  style={{ marginRight: '8px' }}
                >
                  <title>Home Icon</title>
                  <path
                    d='M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
                Get started
              </div>
            </div>

            {/* Placeholder for the Dota logo in a phone frame - simplified for OG image */}
            <div
              style={{
                position: 'absolute',
                right: 80,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 240,
                height: 240,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            >
              <img
                src={`${host?.includes('localhost') ? 'http' : 'https'}://${host}/dotabod.svg`}
                width={160}
                height={160}
                alt='Dotabod Logo'
              />
            </div>
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
