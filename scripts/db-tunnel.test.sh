#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CALL_LOG="$(mktemp)"
trap 'rm -f "$CALL_LOG"' EXIT

docker() {
  printf 'docker %s\n' "$*" >> "$CALL_LOG"
  case "$1" in
    ps)
      printf '%s\n' "$MOCK_DOCKER_NAMES"
      ;;
    exec)
      case "${4:-}" in
        POSTGRES_PASSWORD) printf '%s\n' 'development-password' ;;
        POSTGRES_DB) printf '%s\n' 'postgres' ;;
      esac
      ;;
  esac
}

ssh() {
  printf 'ssh %s\n' "$*" >> "$CALL_LOG"
  return 99
}

sudo() {
  if [ "${1:-}" = '-n' ]; then
    shift
  fi
  "$@"
}

export CALL_LOG
export MOCK_DOCKER_NAMES='supabase-db-local-development'
export -f docker sudo ssh

set +e
output=$(DB_TUNNEL_LOCAL=1 bash "$SCRIPT_DIR/db-tunnel.sh" true 2>&1)
status=$?
set -e

if [ "$status" -eq 0 ]; then
  echo 'db-tunnel.sh treated a non-production Supabase container as production' >&2
  exit 1
fi
grep -q "no running production Supabase DB container" <<< "$output"

> "$CALL_LOG"
export MOCK_DOCKER_NAMES='coolify'
set +e
output=$(bash "$SCRIPT_DIR/db-tunnel.sh" true 2>&1)
status=$?
set -e

if [ "$status" -eq 0 ]; then
  echo 'db-tunnel.sh succeeded without the local production Supabase container' >&2
  exit 1
fi
if grep -q '^ssh ' "$CALL_LOG"; then
  echo 'db-tunnel.sh used SSH even though the production Coolify host was local' >&2
  exit 1
fi
grep -q 'production Coolify host is local' <<< "$output"

echo 'db-tunnel production-container routing: ok'
