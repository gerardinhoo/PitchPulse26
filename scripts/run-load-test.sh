#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCENARIO_FILE="$PROJECT_ROOT/tests/load/pitchpulse-baseline.yml"
FIXTURE_FILE="$PROJECT_ROOT/tests/load/fixtures/verified-users.csv"

if [[ ! -f "$FIXTURE_FILE" ]]; then
  echo "Missing verified user fixture: $FIXTURE_FILE"
  echo "Copy tests/load/fixtures/verified-users.csv.example to verified-users.csv and fill in valid JWT tokens for verified users."
  exit 1
fi

TARGET_URL="${TARGET_URL:-http://localhost:5050/api}"
ARTILLERY_BIN="${ARTILLERY_BIN:-npx artillery}"

echo "Running load test against: $TARGET_URL"
echo "Scenario file: $SCENARIO_FILE"

TARGET_URL="$TARGET_URL" $ARTILLERY_BIN run "$SCENARIO_FILE"
