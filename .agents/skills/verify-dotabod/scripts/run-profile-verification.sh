#!/usr/bin/env bash

set -euo pipefail

verification_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$verification_root"

doctor() {
  local operating_system
  operating_system="$(uname -s)"
  [[ "$operating_system" == 'Linux' || "$operating_system" == 'Darwin' ]] || {
    echo 'verify-dotabod requires Linux or macOS' >&2
    return 1
  }

  for command_name in bash git node pnpm; do
    command -v "$command_name" >/dev/null || {
      echo "missing required command: $command_name" >&2
      return 1
    }
  done

  local chromium_bin="${CHROMIUM_BIN:-}"
  if [[ -z "$chromium_bin" ]]; then
    if [[ "$operating_system" == 'Darwin' ]]; then
      local browser_candidate
      for browser_candidate in \
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
        '/Applications/Chromium.app/Contents/MacOS/Chromium' \
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'; do
        if [[ -x "$browser_candidate" ]]; then
          chromium_bin="$browser_candidate"
          break
        fi
      done
    else
      chromium_bin="$(command -v chromium || command -v chromium-browser || command -v google-chrome-stable || command -v google-chrome || true)"
    fi
  fi
  [[ -n "$chromium_bin" && -x "$chromium_bin" ]] || {
    echo 'missing Chromium; set CHROMIUM_BIN to an executable browser' >&2
    return 1
  }
  export CHROMIUM_BIN="$chromium_bin"

  local initdb_bin
  initdb_bin="$(command -v initdb || true)"
  if [[ -z "$initdb_bin" && "$operating_system" == 'Linux' ]]; then
    initdb_bin="$(find /usr/lib/postgresql -type f -name initdb -perm -u+x -print -quit 2>/dev/null || true)"
  fi
  [[ -n "$initdb_bin" ]] || {
    echo 'missing PostgreSQL initdb' >&2
    return 1
  }
  local postgres_bin
  postgres_bin="$(dirname "$initdb_bin")"
  [[ -x "$postgres_bin/pg_ctl" ]] || {
    echo "missing PostgreSQL pg_ctl beside $initdb_bin" >&2
    return 1
  }
  export POSTGRES_BIN="$postgres_bin"

  local required_file
  for required_file in \
    .agents/skills/dotabod-frontend-verification/scripts/run-frontend-verification.mjs \
    .agents/skills/dotabod-profile-nav-workflow/scripts/seed-profile-fixture.mjs \
    .agents/skills/dotabod-profile-nav-workflow/scripts/audit-profile-navigation.mjs \
    .agents/skills/verify-dotabod/scripts/seed-overlay-fixture.mjs \
    .agents/skills/verify-dotabod/scripts/audit-overlay-dev-mode.mjs; do
    [[ -f "$required_file" ]] || {
      echo "missing required adapter file: $required_file" >&2
      return 1
    }
  done

  git rev-parse --verify HEAD >/dev/null
  git diff --check
  echo "verify-dotabod doctor passed for $(git rev-parse --short HEAD)"
  echo "Operating system: $operating_system"
  echo "Chromium: $CHROMIUM_BIN"
  echo "PostgreSQL: $POSTGRES_BIN"
}

if [[ "${1:-}" == '--doctor' ]]; then
  doctor
  exit 0
fi

if [[ $# -ne 0 ]]; then
  echo 'usage: run-profile-verification.sh [--doctor]' >&2
  exit 2
fi

doctor

exec node .agents/skills/dotabod-frontend-verification/scripts/run-frontend-verification.mjs \
  --output-dir artifacts/verify-dotabod/profile-navigation \
  --check-command 'pnpm exec vitest run src/__tests__/pages/match-history.test.tsx src/__tests__/pages/collection-navigation.test.tsx src/__tests__/pages/profile-match-overview.test.tsx' \
  --check-command 'pnpm check' \
  --check-command 'git diff --check' \
  --env NEXT_PUBLIC_GSI_WEBSOCKET_URL=http://127.0.0.1:9 \
  --seed-command 'node .agents/skills/dotabod-profile-nav-workflow/scripts/seed-profile-fixture.mjs --username maxid1337 --hero-id 2 && node .agents/skills/verify-dotabod/scripts/seed-overlay-fixture.mjs --username maxid1337 --output "$FRONTEND_OUTPUT_DIR/overlay-fixture.json"' \
  --verify-command 'node .agents/skills/dotabod-profile-nav-workflow/scripts/audit-profile-navigation.mjs --base-url "$FRONTEND_BASE_URL" --cdp-url "$FRONTEND_CDP_URL" --username maxid1337 --hero-id 2 --axe-script "$FRONTEND_AXE_SCRIPT" --output-dir "$FRONTEND_OUTPUT_DIR" && node .agents/skills/verify-dotabod/scripts/audit-overlay-dev-mode.mjs --base-url "$FRONTEND_BASE_URL" --cdp-url "$FRONTEND_CDP_URL" --fixture "$FRONTEND_OUTPUT_DIR/overlay-fixture.json" --axe-script "$FRONTEND_AXE_SCRIPT" --output-dir "$FRONTEND_OUTPUT_DIR"'
