// The server rejects an overlay it cannot authenticate without answering the namespace CONNECT.
// It emits `auth_error` first, but the client has not joined the namespace yet, so socket.io
// buffers that event and only replays it after the next successful connect. The transport is
// then dropped by the server's 45s connectTimeout and socket.io redials about a second later.
// This guard ends a handshake that goes unanswered and spaces out the retries instead.

export const HANDSHAKE_TIMEOUT_MS = 10_000
export const RETRY_BASE_MS = 30_000
const RETRY_MAX_MS = 300_000

interface RetryableSocket {
  connect: () => void
  disconnect: () => void
}

interface HandshakeGuard {
  closed: () => void
  connected: () => void
  dispose: () => void
  isBackingOff: () => boolean
  opened: () => void
}

// Each attempt waits between half and all of a ceiling that doubles from RETRY_BASE_MS up to
// RETRY_MAX_MS, so overlays that failed together do not redial together.
export const getRetryDelay = function getRetryDelay(
  failures: number,
  random: () => number,
): number {
  const ceiling = Math.min(RETRY_BASE_MS * 2 ** (failures - 1), RETRY_MAX_MS)
  return Math.round(ceiling * (0.5 + random() / 2))
}

export const createHandshakeGuard = function createHandshakeGuard(
  socket: RetryableSocket,
  random: () => number = Math.random,
): HandshakeGuard {
  let failures = 0
  let handshakeTimer: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  const clearHandshakeTimer = () => {
    if (handshakeTimer !== null) {
      clearTimeout(handshakeTimer)
      handshakeTimer = null
    }
  }

  const clearRetryTimer = () => {
    if (retryTimer !== null) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  const failed = () => {
    clearHandshakeTimer()
    clearRetryTimer()
    failures += 1
    socket.disconnect()
    retryTimer = setTimeout(
      () => {
        retryTimer = null
        socket.connect()
      },
      getRetryDelay(failures, random),
    )
  }

  return {
    closed: clearHandshakeTimer,
    connected: () => {
      clearHandshakeTimer()
      failures = 0
    },
    dispose: () => {
      clearHandshakeTimer()
      clearRetryTimer()
    },
    isBackingOff: () => retryTimer !== null,
    opened: () => {
      clearHandshakeTimer()
      handshakeTimer = setTimeout(failed, HANDSHAKE_TIMEOUT_MS)
    },
  }
}
