// Keys for per-user setting rows the backend writes once on first occurrence.
// Mirrored in /Users/matt/backend/packages/dota/src/dota/setupSignals.ts —
// Changes here require a matching change there.
export const SETUP_SIGNAL_KEYS = {
  gsi: 'gsi_first_seen_at',
  overlay: 'overlay_first_seen_at',
} as const
