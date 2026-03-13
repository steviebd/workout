#!/bin/bash
set -euo pipefail

# Count total lines of TypeScript/React code in src/
LOC=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec cat {} \; | wc -l)

echo "METRIC loc=$LOC"
