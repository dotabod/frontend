/**
 * Feature flags configuration
 *
 * Add feature flags here and set their default values.
 * Features should be disabled by default unless explicitly enabled.
 */

/**
 * Type definition for all feature flags
 */
export interface FeatureFlags {
  enableCryptoPayments: boolean
  enablePaypalPayments: boolean
}

/**
 * Default feature flags configuration
 */
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableCryptoPayments: true,
  enablePaypalPayments: true,
}

/**
 * Current feature flags (can be overridden at runtime)
 */
export const featureFlags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS }

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flagName: keyof FeatureFlags): boolean {
  return featureFlags[flagName]
}
