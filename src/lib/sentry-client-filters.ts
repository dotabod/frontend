import type { ErrorEvent, EventHint } from '@sentry/nextjs'

type FilterableEvent = Pick<ErrorEvent, 'exception'>

const framesOf = (event: FilterableEvent) => event.exception?.values?.[0]?.stacktrace?.frames ?? []

// Some Yandex Browser extensions / AV products monkey-patch
// Object.getOwnPropertyDescriptor with a wrapper that recurses into itself. The
// resulting RangeError has only the wrapper's frames, which the browser reports
// as `<anonymous>`. The SDK marks every browser frame in_app, so the script URL
// is what separates the wrapper from our own code.
const isGetOwnPropertyDescriptorLoop = function isGetOwnPropertyDescriptorLoop(
  event: FilterableEvent,
  hint: EventHint,
) {
  const error = hint.originalException
  if (!(error instanceof RangeError)) {
    return false
  }
  if (!/Maximum call stack size exceeded/iu.test(error.message)) {
    return false
  }

  const frames = framesOf(event)
  return (
    frames.length > 0 &&
    frames.every(
      (f) =>
        f.function?.includes('getOwnPropertyDescriptor') === true && f.filename === '<anonymous>',
    )
  )
}

// A browser extension injects `executors/<n>.js` into the page and throws from
// it (e.g. "Cannot read properties of undefined (reading 'M_ID')"). The Next.js
// SDK rewrites the extension's origin to app://, but the app never serves that
// path.
const isInjectedExecutorScript = function isInjectedExecutorScript(event: FilterableEvent) {
  const frames = framesOf(event)
  return (
    frames.length > 0 && frames.every((f) => f.filename?.startsWith('app:///executors/') === true)
  )
}

export const dropExtensionNoise = function dropExtensionNoise<E extends FilterableEvent>(
  event: E,
  hint: EventHint,
): E | null {
  if (isGetOwnPropertyDescriptorLoop(event, hint) || isInjectedExecutorScript(event)) {
    return null
  }
  return event
}
