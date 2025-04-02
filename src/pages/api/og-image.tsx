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
  const title = searchParams.get('title') || ''
  const subtitle = searchParams.get('subtitle') || ''

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
        {/* Background with grid pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom right, #1f2937, #111827)',
            opacity: 0.9,
          }}
        />
        <svg
          aria-hidden='true'
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            height: '100%',
            width: '100%',
            fill: 'rgba(156, 163, 175, 0.3)',
            stroke: 'rgba(156, 163, 175, 0.3)',
            maskImage: 'linear-gradient(to bottom right, white, transparent, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom right, white, transparent, transparent)',
          }}
        >
          <defs>
            <pattern
              id='grid-pattern'
              width={20}
              height={20}
              patternUnits='userSpaceOnUse'
              x={-1}
              y={-1}
            >
              <path d='M.5 20V.5H20' fill='none' strokeDasharray='0' />
            </pattern>
          </defs>
          <rect width='100%' height='100%' strokeWidth={0} fill='url(#grid-pattern)' />
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
          <svg x={-1} y={-1} style={{ overflow: 'visible' }}>
            {Array.from({ length: 20 }).flatMap((_, i) =>
              Array.from({ length: 20 }).map((_, j) => (
                <rect
                  strokeWidth='0'
                  key={`grid-${i}-${j}`}
                  width={19}
                  height={19}
                  x={i * 20 + 1}
                  y={j * 20 + 1}
                />
              )),
            )}
          </svg>
        </svg>

        {/* Dota logo in bottom right corner, partially cut off and faded */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '-150px',
            right: '-150px',
            width: '400px',
            height: '400px',
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)',
          }}
        >
          <img
            src={`${host?.includes('localhost') ? 'http' : 'https'}://${host}/images/dota.svg`}
            alt='Dota Logo'
            width={400}
            height={400}
          />
        </div>
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'radial-gradient(#4B5563 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            opacity: 0.1,
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
            padding: '60px',
          }}
        >
          {/* Template-specific content */}
          {children}

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 40,
              fontSize: 24,
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 500,
              display: 'flex',
              marginBottom: 48,
              alignItems: 'center',
            }}
          >
            <img
              src={`${host?.includes('localhost') ? 'http' : 'https'}://${host}/dotabod.svg`}
              alt='Dotabod Logo'
              width={85}
              height={85}
            />
            <span
              style={{
                fontSize: 55,
                fontWeight: 'bold',
                color: 'white',
                marginLeft: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span>Dotabod</span>
              <img
                src={`${host?.includes('localhost') ? 'http' : 'https'}://${host}/images/emotes/peepofat.gif`}
                alt='Peepofat'
                width={55}
                height={55}
              />
            </span>
          </div>
        </div>
      </div>
    )

    // Choose template based on page type
    const content = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '900px',
        }}
      >
        <h1
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
            marginBottom: 24,
            textShadow: '0px 4px 4px rgba(0, 0, 0, 0.5)',
            lineHeight: 1.2,
          }}
        >
          {title || 'Blog Post'}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: 28,
              color: '#9CA3AF',
              margin: 0,
              marginTop: 0,
              maxWidth: '80%',
              lineHeight: 1.4,
              textShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    )

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
