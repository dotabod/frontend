#!/usr/bin/env bash
set -euo pipefail

tlc_jar=$1
cd "$(dirname "$0")"
work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT

java -XX:+UseParallelGC -cp "$tlc_jar" tlc2.TLC -workers 1 \
  -metadir "$work_dir/current" -config PaymentProgress.cfg PaymentProgress

for replay in HistoricalOverwrite HistoricalDuplicateAlert; do
  case "$replay" in
    HistoricalOverwrite) invariant=FinishedStaysFinished ;;
    HistoricalDuplicateAlert) invariant=OnlyOnePartialPaymentAlert ;;
  esac

  status=0
  java -XX:+UseParallelGC -cp "$tlc_jar" tlc2.TLC -workers 1 \
    -metadir "$work_dir/$replay" -config "$replay.cfg" PaymentProgress \
    >"$work_dir/$replay.log" 2>&1 || status=$?
  cat "$work_dir/$replay.log"
  if [[ "$status" -ne 12 ]] ||
    ! grep -Fq "Invariant $invariant is violated." "$work_dir/$replay.log"; then
    echo "Expected TLC to reject $replay on $invariant"
    exit 1
  fi
done
