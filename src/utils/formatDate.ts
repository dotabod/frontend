export function formatDate(dateString: string | Date) {
  // Create a date object, handling timezone issues
  const date = new Date(dateString)

  // Use UTC methods to avoid timezone conversion problems
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

  return utcDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
