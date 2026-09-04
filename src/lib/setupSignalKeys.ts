// Keys for per-user setting rows the backend writes once on first occurrence.
// Mirrored in /Users/matt/backend/packages/dota/src/dota/setupSignals.ts —
// Changes here require a matching change there.
export const SETUP_SIGNAL_KEYS = {
  gsi: 'gsi_first_seen_at',
  gsiLastSeen: 'gsi_last_seen_at',
  overlay: 'overlay_first_seen_at',
  overlayPageLastSeen: 'overlay_page_last_seen_at',
  overlaySocketLastSeen: 'overlay_socket_last_seen_at',
} as const
