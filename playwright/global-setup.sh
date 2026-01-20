#!/bin/bash
# This script wraps the global setup to provide Infisical environment variables
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to project directory
cd "$SCRIPT_DIR"

# Run the actual global setup with Infisical environment variables
exec infisical run --env dev -- npx tsx "$SCRIPT_DIR/playwright/global-setup.ts"
