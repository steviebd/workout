#!/bin/bash
set -euo pipefail

# Run typecheck - suppress success output, only show errors
bun run typecheck 2>&1 | grep -i error || true

# Run tests - suppress success output
bun run test 2>&1 | tail -20
