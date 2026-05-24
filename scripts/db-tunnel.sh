#!/usr/bin/env bash
# SSH local-forwards oracle:5432 (supabase-db container, host-bound but
# firewalled from the public internet) to localhost:15432, runs the command
# passed as args inside `doppler run -- env DIRECT_URL=... DATABASE_URL=...`
# so the tunnel-rewritten URLs override Doppler's injection, and tears the
# tunnel down regardless of how the command exits.
#
# Why this exists: `prisma db push` (and any tool using DIRECT_URL) hits
# the Supabase Postgres on port 5432, which is no longer reachable on
# oracle's public IP from outside the host. The pgbouncer pooler on :6543
# is still public (DATABASE_URL works for runtime), but DDL needs the
# direct connection.
#
# Usage (note: no `doppler run --` prefix — the script wraps with doppler
# itself so its env-override trick works):
#   scripts/db-tunnel.sh npx prisma db push
#   scripts/db-tunnel.sh npx prisma db pull
#   scripts/db-tunnel.sh npx prisma studio
#   scripts/db-tunnel.sh bash -c 'psql "$DIRECT_URL" -c "\\dt"'

set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 2
fi

LOCAL_PORT="${DB_TUNNEL_LOCAL_PORT:-15432}"
SOCK="/tmp/dotabod-db-tunnel.sock"

cleanup() {
  if [ -S "$SOCK" ]; then
    ssh -O exit -S "$SOCK" oracle >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

if [ -S "$SOCK" ]; then
  echo "Stale tunnel socket at $SOCK; cleaning up." >&2
  ssh -O exit -S "$SOCK" oracle >/dev/null 2>&1 || rm -f "$SOCK"
fi

echo "Opening SSH tunnel oracle:5432 → localhost:$LOCAL_PORT..." >&2
ssh -fN -M -S "$SOCK" -L "$LOCAL_PORT:127.0.0.1:5432" oracle

# Pull canonical URLs from Doppler and rewrite host:port to the tunnel.
# Works for any URL host (IP or DNS).
ORIG_DIRECT_URL=$(doppler secrets get DIRECT_URL --plain 2>/dev/null || true)
if [ -z "$ORIG_DIRECT_URL" ]; then
  echo "Could not read DIRECT_URL from Doppler. Aborting." >&2
  exit 1
fi
TUNNELED_DIRECT_URL=$(printf '%s' "$ORIG_DIRECT_URL" | sed -E "s#@[^/?]+#@127.0.0.1:$LOCAL_PORT#")

ORIG_DATABASE_URL=$(doppler secrets get DATABASE_URL --plain 2>/dev/null || true)
TUNNELED_DATABASE_URL=""
if [ -n "$ORIG_DATABASE_URL" ]; then
  TUNNELED_DATABASE_URL=$(printf '%s' "$ORIG_DATABASE_URL" | sed -E "s#@[^/?]+#@127.0.0.1:$LOCAL_PORT#")
fi

echo "Running: doppler run -- env DIRECT_URL=<tunneled> DATABASE_URL=<tunneled> $*" >&2
# `doppler run --` injects its own DIRECT_URL/DATABASE_URL into the child.
# Wrapping the actual command with `env VAR=val` runs after doppler's
# injection, so our tunneled URLs win.
if [ -n "$TUNNELED_DATABASE_URL" ]; then
  exec doppler run -- env \
    "DIRECT_URL=$TUNNELED_DIRECT_URL" \
    "DATABASE_URL=$TUNNELED_DATABASE_URL" \
    "$@"
else
  exec doppler run -- env "DIRECT_URL=$TUNNELED_DIRECT_URL" "$@"
fi
