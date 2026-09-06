const DEBUG_ENABLED = process.env.STRIPE_WEBHOOK_DEBUG === 'true'

export const debugLog = function debugLog(...messages: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.log('[DEBUG]', ...messages)
  }
}
