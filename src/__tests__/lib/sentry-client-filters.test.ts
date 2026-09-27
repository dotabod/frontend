import type { StackFrame } from '@sentry/nextjs'
import { describe, expect, it } from 'vitest'

import { dropExtensionNoise } from '@/lib/sentry-client-filters'

const eventWithFrames = (frames: StackFrame[]) => ({
  exception: { values: [{ stacktrace: { frames }, type: 'Error' }] },
})

describe(dropExtensionNoise, () => {
  it('drops getOwnPropertyDescriptor recursion from an injected wrapper', () => {
    const frame = {
      filename: '<anonymous>',
      function: 'Object.getOwnPropertyDescriptor [as _getOwnPropertyDescriptor]',
      in_app: true,
    }
    const event = eventWithFrames([frame, frame])
    const error = new RangeError('Maximum call stack size exceeded')

    expect(dropExtensionNoise(event, { originalException: error })).toBeNull()
  })

  it('keeps a stack overflow that runs through our own chunks', () => {
    const event = eventWithFrames([
      {
        filename: 'app:///_next/static/chunks/_app-CRC9o0oJ.js',
        function: 'getOwnPropertyDescriptor',
        in_app: true,
      },
    ])
    const error = new RangeError('Maximum call stack size exceeded')

    expect(dropExtensionNoise(event, { originalException: error })).toBe(event)
  })

  it('drops errors thrown only from the injected executors script', () => {
    const event = eventWithFrames([
      { filename: 'app:///executors/200.js', function: 'E', in_app: true },
      { filename: 'app:///executors/200.js', function: 'Y', in_app: true },
    ])
    const error = new TypeError("Cannot read properties of undefined (reading 'M_ID')")

    expect(dropExtensionNoise(event, { originalException: error })).toBeNull()
  })

  it('keeps errors that pass through app code', () => {
    const event = eventWithFrames([
      { filename: 'app:///executors/200.js', function: 'E', in_app: true },
      { filename: 'app:///_next/static/chunks/pages-BGzDZV0G.js', function: 'd', in_app: true },
    ])

    expect(dropExtensionNoise(event, { originalException: new TypeError('boom') })).toBe(event)
  })
})
