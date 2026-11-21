#!/usr/bin/env bash
set -euo pipefail

tlc_jar=$1
cd "$(dirname "$0")"
work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT

java -XX:+UseParallelGC -cp "$tlc_jar" tlc2.TLC -workers 1 \
  -metadir "$work_dir/current" -config OverlayHandshake.cfg OverlayHandshake

status=0
java -XX:+UseParallelGC -cp "$tlc_jar" tlc2.TLC -workers 1 \
  -metadir "$work_dir/historical" -config HistoricalAuthListener.cfg OverlayHandshake \
  >"$work_dir/historical.log" 2>&1 || status=$?
cat "$work_dir/historical.log"
if [[ "$status" -ne 12 ]] ||
  ! grep -Fq 'Invariant BufferedErrorLeavesAcceptedSocketConnected is violated.' "$work_dir/historical.log"; then
  echo 'Expected TLC to reject the historical auth_error listener'
  exit 1
fi
