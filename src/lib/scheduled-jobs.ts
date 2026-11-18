import { captureException, flush } from '@sentry/nextjs'

// Sentry sends events in the background, and a cron run ends as soon as scheduled() resolves, which
// cancels any send still in flight. Request handlers get this wait from the Sentry SDK itself.
const FLUSH_TIMEOUT_MS = 2000

interface ErrorReporter {
  capture: (error: Error) => void
  flush: (timeoutMs: number) => Promise<boolean>
}

const sentryReporter: ErrorReporter = {
  capture: (error) => {
    captureException(error)
  },
  flush,
}

export const runScheduledJobs = async function runScheduledJobs(
  jobs: () => Promise<void>,
  reporter: ErrorReporter = sentryReporter,
): Promise<void> {
  try {
    await jobs()
  } catch (error) {
    reporter.capture(error instanceof Error ? error : new Error(String(error)))
    throw error
  } finally {
    await reporter.flush(FLUSH_TIMEOUT_MS)
  }
}
