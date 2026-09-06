/**
 * Utility functions for handling gift subscription links
 */

/**
 * Creates a URL for gifting a subscription to a specific user
 * @param username The username to gift a subscription to
 * @returns The URL for the gift page
 */
export const createGiftLink = (username: string): string => {
  const formattedUsername = username.trim().toLowerCase()

  // Legacy Twitch login names can be 1–25 letters, numbers, or underscores.
  if (!/^[a-z0-9_]{1,25}$/u.test(formattedUsername)) {
    return '/gift'
  }

  return `/${encodeURIComponent(formattedUsername)}/gift`
}
