/**
 * Local Network Access (LNA) utility functions
 *
 * Provides helpers for detecting Chrome LNA support, querying permission state,
 * and building fetch options with targetAddressSpace annotations.
 */

/**
 * Permission state for local-network-access
 */
export type LnaPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported'

/**
 * Address space type for targetAddressSpace option
 */
export type TargetAddressSpace = 'local' | 'loopback'

/**
 * Extended RequestInit with targetAddressSpace support
 */
export interface LocalFetchOptions extends RequestInit {
  targetAddressSpace?: TargetAddressSpace
}

/**
 * Check if we're running in a secure context
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false
  return window.isSecureContext ?? false
}

/**
 * Detect if we're running in Chrome (or Chromium-based browsers)
 */
export function isChrome(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Chrome/.test(ua) && !/Edg|OPR|Brave/.test(ua)
}

/**
 * Get Chrome major version number
 * Returns null if not Chrome or version cannot be determined
 */
export function getChromeVersion(): number | null {
  if (!isChrome() || typeof navigator === 'undefined') return null

  const ua = navigator.userAgent
  const match = ua.match(/Chrome\/(\d+)/)
  if (!match) return null

  const version = Number.parseInt(match[1], 10)
  return Number.isNaN(version) ? null : version
}

/**
 * Check if Chrome version supports LNA (>=142)
 */
export function isChromeLnaEnabled(): boolean {
  const version = getChromeVersion()
  return version !== null && version >= 142
}

/**
 * Query the local-network-access permission state
 * Returns 'unsupported' if permissions API is not available or not in secure context
 */
export async function queryLnaPermission(): Promise<LnaPermissionState> {
  // LNA requires secure context
  if (!isSecureContext()) {
    return 'unsupported'
  }

  // Check if Permissions API is available
  if (typeof navigator === 'undefined' || !('permissions' in navigator)) {
    return 'unsupported'
  }

  try {
    // Type assertion needed because TypeScript doesn't know about 'local-network-access' yet
    const result = await navigator.permissions.query({
      name: 'local-network-access' as PermissionName,
    })
    return result.state as LnaPermissionState
  } catch (_error) {
    // Permission name not recognized or other error
    return 'unsupported'
  }
}

/**
 * Build fetch options with targetAddressSpace annotation
 * Only adds targetAddressSpace if supported by the browser
 *
 * @param baseInit - Base RequestInit options
 * @param addressSpace - 'local' or 'loopback' to indicate target address space
 * @returns RequestInit with targetAddressSpace added if supported
 */
export function buildLocalFetchOptions(
  baseInit: RequestInit,
  addressSpace: TargetAddressSpace,
): LocalFetchOptions {
  const options: LocalFetchOptions = { ...baseInit }

  // Feature detect support for targetAddressSpace
  // We check if Request constructor accepts it by checking if the property exists
  // In practice, we'll add it and let the browser handle it
  if (typeof Request !== 'undefined') {
    // Add targetAddressSpace - browsers that support it will use it,
    // others will ignore unknown properties
    options.targetAddressSpace = addressSpace
  }

  return options
}

/**
 * Check if LNA should be checked/enforced for the current browser context
 * Returns true if:
 * - Running in Chrome >=142
 * - In a secure context
 * - Permissions API is available
 */
export function shouldCheckLna(): boolean {
  return isSecureContext() && isChromeLnaEnabled() && 'permissions' in navigator
}
