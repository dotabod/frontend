export const reportOverlayPage = async function reportOverlayPage(
  userId: string,
): Promise<boolean> {
  try {
    const response = await fetch('/api/diagnostics/overlay-page', {
      body: JSON.stringify({ userId }),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      method: 'POST',
    })
    return response.ok
  } catch {
    return false
  }
}
