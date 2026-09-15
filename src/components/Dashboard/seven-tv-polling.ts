const POLL_INTERVAL_MS = 5_000
const INITIAL_ERROR_DELAY_MS = 10_000
const MAX_ERROR_DELAY_MS = 60_000

interface VisibilityDocument {
  readonly visibilityState: DocumentVisibilityState
  addEventListener: (type: 'visibilitychange', listener: () => void) => void
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void
}

interface SevenTvPollingOptions {
  documentObject?: VisibilityDocument
  onError?: (error: unknown) => void
  poll: (signal: AbortSignal) => Promise<boolean>
}

const isAbortError = (error: unknown) => error instanceof Error && error.name === 'AbortError'

export const startSevenTvPolling = ({
  documentObject = document,
  onError,
  poll,
}: SevenTvPollingOptions) => {
  let activeRequest: AbortController | null = null
  let consecutiveErrors = 0
  let finished = false
  let rerunWhenRequestSettles = false
  let stopped = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const clearScheduledPoll = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const schedulePoll = (delay: number) => {
    clearScheduledPoll()
    timeoutId = setTimeout(() => {
      timeoutId = null
      void runPoll()
    }, delay)
  }

  const runPoll = async () => {
    if (stopped || finished || documentObject.visibilityState !== 'visible' || activeRequest) {
      return
    }

    activeRequest = new AbortController()
    let nextDelay: number | null = null

    try {
      const shouldContinue = await poll(activeRequest.signal)
      consecutiveErrors = 0

      if (shouldContinue) {
        nextDelay = POLL_INTERVAL_MS
      } else {
        finished = true
      }
    } catch (error) {
      if (!isAbortError(error)) {
        consecutiveErrors += 1
        nextDelay = Math.min(
          INITIAL_ERROR_DELAY_MS * 2 ** (consecutiveErrors - 1),
          MAX_ERROR_DELAY_MS,
        )
        onError?.(error)
      }
    } finally {
      activeRequest = null
    }

    if (stopped || finished || documentObject.visibilityState !== 'visible') {
      return
    }

    if (rerunWhenRequestSettles) {
      rerunWhenRequestSettles = false
      void runPoll()
      return
    }

    if (nextDelay !== null) {
      schedulePoll(nextDelay)
    }
  }

  const handleVisibilityChange = () => {
    clearScheduledPoll()

    if (documentObject.visibilityState !== 'visible') {
      rerunWhenRequestSettles = false
      activeRequest?.abort()
      return
    }

    if (activeRequest) {
      rerunWhenRequestSettles = true
      return
    }

    void runPoll()
  }

  documentObject.addEventListener('visibilitychange', handleVisibilityChange)
  void runPoll()

  return () => {
    stopped = true
    clearScheduledPoll()
    activeRequest?.abort()
    documentObject.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
