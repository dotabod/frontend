#!/usr/bin/env bash

set -euo pipefail

verification_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$verification_root"

doctor() {
  if [[ "${RUNNER_ENVIRONMENT:-}" != 'github-hosted' ]]; then
    echo 'verify-dotabod may run only on a GitHub-hosted runner' >&2
    return 1
  fi

  [[ "$(uname -s)" == 'Linux' ]] || {
    echo 'verify-dotabod requires Linux' >&2
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
    chromium_bin="$(command -v chromium || command -v chromium-browser || command -v google-chrome-stable || command -v google-chrome || true)"
  fi
  [[ -n "$chromium_bin" && -x "$chromium_bin" ]] || {
    echo 'missing Chromium; set CHROMIUM_BIN to an executable browser' >&2
    return 1
  }
  export CHROMIUM_BIN="$chromium_bin"

  local postgres_bin
  postgres_bin="$(find /usr/lib/postgresql -type f -name initdb -perm -u+x -print -quit 2>/dev/null || true)"
  [[ -n "$postgres_bin" ]] || {
    echo 'missing PostgreSQL initdb under /usr/lib/postgresql' >&2
    return 1
  }

  local required_file
  for required_file in \
    .agents/skills/dotabod-frontend-verification/scripts/run-frontend-verification.mjs \
    .agents/skills/dotabod-profile-nav-workflow/scripts/seed-profile-fixture.mjs \
    .agents/skills/dotabod-profile-nav-workflow/scripts/audit-profile-navigation.mjs; do
    [[ -f "$required_file" ]] || {
      echo "missing required adapter file: $required_file" >&2
      return 1
    }
  done

  git rev-parse --verify HEAD >/dev/null
  git diff --check
  echo "verify-dotabod doctor passed for $(git rev-parse --short HEAD)"
  echo "Chromium: $CHROMIUM_BIN"
  echo "PostgreSQL: $postgres_bin"
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
  --seed-command 'node .agents/skills/dotabod-profile-nav-workflow/scripts/seed-profile-fixture.mjs --username maxid1337 --hero-id 2' \
  --verify-command 'node .agents/skills/dotabod-profile-nav-workflow/scripts/audit-profile-navigation.mjs --base-url "$FRONTEND_BASE_URL" --cdp-url "$FRONTEND_CDP_URL" --username maxid1337 --hero-id 2 --axe-script "$FRONTEND_AXE_SCRIPT" --output-dir "$FRONTEND_OUTPUT_DIR"'
