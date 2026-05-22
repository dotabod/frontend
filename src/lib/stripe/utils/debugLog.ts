const DEBUG_ENABLED = process.env.STRIPE_WEBHOOK_DEBUG === 'true'

/**
 * Logs messages only when debug mode is enabled.
 * Prepends "[DEBUG]" to all messages for easy filtering.
 * @param messages Items to log
 */
export function debugLog(...messages: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.log('[DEBUG]', ...messages)
  }
}
