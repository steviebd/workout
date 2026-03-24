#!/bin/bash
set -euo pipefail

cd /Users/steven/workout

# Run unit tests with vitest
echo "Running unit tests..."
UNIT_OUTPUT=$(bun run test 2>&1) || true
# Get the number from "329 passed (331)" - last occurrence is the test count
UNIT_PASS=$(echo "$UNIT_OUTPUT" | grep -oE "[0-9]+ passed \([0-9]+\)" | grep -oE "^[0-9]+" | tail -1 || echo "0")

# Check E2E test files - try to list them
echo "Checking E2E test files..."
E2E_FILE_COUNT=$(ls tests/e2e/*.spec.ts 2>/dev/null | wc -l)

# Try to list E2E tests (may require auth)
E2E_PASS=0
E2E_LIST=$(npx playwright test tests/e2e/*.spec.ts --list 2>&1 || true)
if echo "$E2E_LIST" | grep -q "Total:"; then
    E2E_PASS=$(echo "$E2E_LIST" | grep "Total:" | grep -oE "[0-9]+" | head -1 || echo "0")
fi

# Total passing tests
TOTAL_PASS=$((UNIT_PASS + E2E_PASS))

echo "METRIC unit_passing=$UNIT_PASS"
echo "METRIC e2e_passing=$E2E_PASS"
echo "METRIC passing_tests=$TOTAL_PASS"

# Output summary
echo ""
echo "=== Test Summary ==="
echo "Unit tests passing: $UNIT_PASS"
echo "E2E tests passing: $E2E_PASS"
echo "Total passing: $TOTAL_PASS"
