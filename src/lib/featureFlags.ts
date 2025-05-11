/**
 * Feature flags configuration
 * 
 * Add feature flags here and set their default values.
 * Features should be disabled by default unless explicitly enabled.
 */

/**
 * Type definition for all feature flags
 */
export type FeatureFlags = {
  enableCryptoPayments: boolean
}

/**
 * Default feature flags configuration
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableCryptoPayments: false
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

/**
 * Enable a feature
 */
export function enableFeature(flagName: keyof FeatureFlags): void {
  featureFlags[flagName] = true
}

/**
 * Disable a feature
 */
export function disableFeature(flagName: keyof FeatureFlags): void {
  featureFlags[flagName] = false
}