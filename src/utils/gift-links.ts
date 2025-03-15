/**
 * Utility functions for handling gift subscription links
 */

/**
 * Creates a URL for gifting a subscription to a specific user
 * @param username The username to gift a subscription to
 * @returns The URL for the gift page
 */
export function createGiftLink(username: string): string {
  if (!username) return '/gift'

  // Ensure the username is properly formatted
  const formattedUsername = username.trim().toLowerCase()

  return `/${formattedUsername}/gift`
}

/**
 * Checks if a path is a gift page
 * @param path The current path
 * @returns True if the path is a gift page
 */
export function isGiftPage(path: string): boolean {
  return path === '/gift' || /^\/[^\/]+\/gift$/.test(path)
}
