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

const isSecureContext = function isSecureContext(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.isSecureContext ?? false
}

const isChrome = function isChrome(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  const ua = navigator.userAgent
  return ua.includes('Chrome') && !/Edg|OPR|Brave/u.test(ua)
}

const getChromeVersion = function getChromeVersion(): number | null {
  if (!isChrome() || typeof navigator === 'undefined') {
    return null
  }

  const ua = navigator.userAgent
  const match = /Chrome\/(\d+)/u.exec(ua)
  if (!match) {
    return null
  }

  const version = Number.parseInt(match[1], 10)
  return Number.isNaN(version) ? null : version
}

const isChromeLnaEnabled = function isChromeLnaEnabled(): boolean {
  const version = getChromeVersion()
  return version !== null && version >= 142
}

export const queryLnaPermission = async function queryLnaPermission(): Promise<LnaPermissionState> {
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
    return result.state
  } catch {
    // Permission name not recognized or other error
    return 'unsupported'
  }
}

export const buildLocalFetchOptions = function buildLocalFetchOptions(
  baseInit: RequestInit,
  addressSpace: TargetAddressSpace,
): LocalFetchOptions {
  const options: LocalFetchOptions = { ...baseInit }

  // Feature detect support for targetAddressSpace
  // We check if Request constructor accepts it by checking if the property exists
  // In practice, we'll add it and let the browser handle it
  if (typeof Request !== 'undefined') {
    // Add targetAddressSpace - browsers that support it will use it,
    // Others will ignore unknown properties
    options.targetAddressSpace = addressSpace
  }

  return options
}

export const shouldCheckLna = function shouldCheckLna(): boolean {
  return isSecureContext() && isChromeLnaEnabled() && 'permissions' in navigator
}
