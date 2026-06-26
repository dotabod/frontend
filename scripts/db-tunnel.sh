#!/usr/bin/env bash
# Run a command (prisma db push/pull/studio, psql, a migration, ...) against the Supabase
# Postgres with DIRECT_URL/DATABASE_URL pointed at a reachable address.
#
# Two modes, auto-selected:
#
#   LOCAL  — when the supabase-db container runs on THIS host (i.e. the prod box itself).
#            Talks to its published 127.0.0.1:5432 directly, reading the password from the
#            container. No SSH, no Doppler. This exists because on the prod host `ssh oracle`
#            loops back and fails ("Permission denied (publickey)"), so the tunnel path below
#            is unusable there — that's the churn this avoids.
#
#   TUNNEL — otherwise (dev laptops). SSH local-forwards oracle:5432 → localhost:15432 and
#            rewrites the Doppler-injected URLs to the tunnel, since the Supabase Postgres on
#            5432 isn't reachable on oracle's public IP and DDL needs that direct connection
#            (the public pooler is only on :6543).
#
# Override the auto-detect with DB_TUNNEL_LOCAL=1 (force local) or DB_TUNNEL_LOCAL=0 (force
# tunnel). In local mode the published port defaults to 5432, override with DB_LOCAL_PORT.
#
# Usage (note: no `doppler run --` prefix — tunnel mode wraps with doppler itself):
#   scripts/db-tunnel.sh npx prisma db push
#   scripts/db-tunnel.sh npx prisma db pull
#   scripts/db-tunnel.sh npx prisma studio
#   scripts/db-tunnel.sh bash -c 'psql "$DIRECT_URL" -c "\\dt"'
#   scripts/db-tunnel.sh bash -c 'psql "$DIRECT_URL" -f supabase/migrations/<file>.sql'

set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 2
fi

LOCAL_MODE="${DB_TUNNEL_LOCAL:-auto}"

# Pick a docker invocation that works without prompting (`-n` never asks for a sudo password,
# so dev laptops with no/locked-down docker just fall through to tunnel mode).
DOCKER=""
if [ "$LOCAL_MODE" != "0" ]; then
  if docker ps >/dev/null 2>&1; then
    DOCKER="docker"
  elif sudo -n docker ps >/dev/null 2>&1; then
    DOCKER="sudo -n docker"
  fi
fi

# Find a running supabase-db container (the strong signal we're on the host that owns the DB).
DB_CONTAINER=""
if [ -n "$DOCKER" ]; then
  DB_CONTAINER=$($DOCKER ps --filter 'name=supabase-db' --format '{{.Names}}' 2>/dev/null | head -n1 || true)
fi

if [ "$LOCAL_MODE" = "1" ] && [ -z "$DB_CONTAINER" ]; then
  echo "DB_TUNNEL_LOCAL=1 but no running 'supabase-db' container was found on this host." >&2
  exit 1
fi

if [ -n "$DB_CONTAINER" ] && { [ "$LOCAL_MODE" = "1" ] || [ "$LOCAL_MODE" = "auto" ]; }; then
  # ---- LOCAL MODE: connect to the on-host container's published port directly ----
  echo "Local supabase-db container '$DB_CONTAINER' detected — connecting directly (no SSH/Doppler)." >&2

  PW=$($DOCKER exec "$DB_CONTAINER" printenv POSTGRES_PASSWORD 2>/dev/null || true)
  if [ -z "$PW" ]; then
    echo "Could not read POSTGRES_PASSWORD from '$DB_CONTAINER'. Aborting." >&2
    exit 1
  fi
  DBNAME=$($DOCKER exec "$DB_CONTAINER" printenv POSTGRES_DB 2>/dev/null || true)
  DBNAME="${DBNAME:-postgres}"
  HOST_PORT="${DB_LOCAL_PORT:-5432}"

  # Percent-encode the password so URL-special chars survive in DIRECT_URL/DATABASE_URL
  # (pure bash, ASCII — Supabase passwords are ASCII). PG* vars below take it raw.
  ENC_PW=''
  for ((i = 0; i < ${#PW}; i++)); do
    c="${PW:i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) ENC_PW+="$c" ;;
      *) printf -v c '%%%02X' "'$c"; ENC_PW+="$c" ;;
    esac
  done

  LOCAL_URL="postgresql://postgres:${ENC_PW}@127.0.0.1:${HOST_PORT}/${DBNAME}"
  echo "Running: env DIRECT_URL=<local> DATABASE_URL=<local> $*" >&2
  # Set both URL forms (prisma) and PG* vars (psql) so either tool connects with no extra args.
  exec env \
    "DIRECT_URL=$LOCAL_URL" \
    "DATABASE_URL=$LOCAL_URL" \
    "PGHOST=127.0.0.1" "PGPORT=$HOST_PORT" "PGUSER=postgres" "PGPASSWORD=$PW" "PGDATABASE=$DBNAME" \
    "$@"
fi

# ---- TUNNEL MODE: SSH-forward the firewalled Postgres (dev laptops) ----
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
