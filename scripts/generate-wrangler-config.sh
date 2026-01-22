#!/bin/bash

set -euo pipefail

TARGET_ENV=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      TARGET_ENV="$2"
      shift 2
      ;;
    dev|staging|production|prod)
      TARGET_ENV="$1"
      shift
      ;;
    *)
      echo "Error: Unknown argument: $1"
      echo "Usage: $0 [--env dev|staging|production]"
      exit 1
      ;;
  esac
done

if [ -z "$TARGET_ENV" ]; then
  TARGET_ENV="dev"
fi

case "$TARGET_ENV" in
  dev|staging|production|prod) ;;
  *)
    echo "Error: Unknown environment '$TARGET_ENV'. Use dev, staging, production, or prod."
    exit 1
    ;;
esac

INFISICAL_ENV="$TARGET_ENV"
if [ "$TARGET_ENV" = "prod" ]; then
  INFISICAL_ENV="prod"
fi

CONFIG_FILE="wrangler.toml"

echo "Generating $CONFIG_FILE for env '$TARGET_ENV'..."

if [ -n "${ENVIRONMENT:-}" ]; then
  ENVIRONMENT_VALUE="$ENVIRONMENT"
else
  ENVIRONMENT_VALUE="$TARGET_ENV"
fi

if [ "${REMOTE:-}" = "true" ]; then
  USE_REMOTE="true"
else
  USE_REMOTE="false"
fi

case "$ENVIRONMENT_VALUE" in
  dev)
    WORKER_NAME="workout-dev"
    DB_NAME="workout-dev-db"
    if [ "$USE_REMOTE" = "true" ]; then
      DB_ID="${CLOUDFLARE_D1_DATABASE_ID:-}"
      REMOTE="true"
    else
      DB_ID="00000000-0000-0000-0000-000000000000"
      REMOTE="false"
    fi
    ;;
  staging)
    WORKER_NAME="workout-staging"
    DB_NAME="workout-staging-db"
    DB_ID="${CLOUDFLARE_D1_DATABASE_ID:-}"
    REMOTE="true"
    ;;
  production|prod)
    WORKER_NAME="workout-prod"
    DB_NAME="workout-prod-db"
    DB_ID="${CLOUDFLARE_D1_DATABASE_ID:-}"
    REMOTE="true"
    ;;
  *)
    WORKER_NAME="workout-${ENVIRONMENT_VALUE}"
    DB_NAME="workout-${ENVIRONMENT_VALUE}-db"
    DB_ID="${CLOUDFLARE_D1_DATABASE_ID:-}"
    REMOTE="true"
    ;;
esac

if [ "$ENVIRONMENT_VALUE" = "dev" ] && [ "${REMOTE:-false}" = "true" ] && [ -z "$DB_ID" ]; then
  echo "Error: Could not retrieve CLOUDFLARE_D1_DATABASE_ID for remote dev"
  exit 1
elif [ "$ENVIRONMENT_VALUE" != "dev" ] && [ -z "$DB_ID" ]; then
  echo "Error: Could not retrieve CLOUDFLARE_D1_DATABASE_ID for '$TARGET_ENV'"
  exit 1
fi

python3 - "$CONFIG_FILE" "$WORKER_NAME" "$DB_NAME" "$DB_ID" "$REMOTE" "$ENVIRONMENT_VALUE" << 'PYTHON'
import json
import os
import sys

config_path = sys.argv[1]
worker_name = sys.argv[2]
db_name = sys.argv[3]
db_id = sys.argv[4]
remote = sys.argv[5]
environment = sys.argv[6]

env_vars = {
    'ENVIRONMENT': os.environ.get('ENVIRONMENT', ''),
    'POSTHOG_API_KEY': os.environ.get('POSTHOG_API_KEY', ''),
    'POSTHOG_PROJECT_URL': os.environ.get('POSTHOG_PROJECT_URL', ''),
    'TEST_PASSWORD': os.environ.get('TEST_PASSWORD', ''),
    'TEST_USERNAME': os.environ.get('TEST_USERNAME', ''),
    'WORKOS_API_KEY': os.environ.get('WORKOS_API_KEY', ''),
    'WORKOS_CLIENT_ID': os.environ.get('WORKOS_CLIENT_ID', ''),
}

vars_lines = []
vars_lines.append(f'ENVIRONMENT = "{environment}"')

for key, value in sorted(env_vars.items()):
    if key == 'ENVIRONMENT':
        continue
    if value:
        vars_lines.append(f'{key} = "{value}"')

vars_content = '\n'.join(vars_lines)

content = f'''name = "{worker_name}"
main = "@tanstack/react-start/server-entry"
compatibility_date = "2025-09-02"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "{db_name}"
database_id = "{db_id}"
remote = {remote}

[observability]
enabled = true

[vars]
{vars_content}
'''

with open(config_path, 'w') as f:
    f.write(content)

print(f"Generated {config_path} with name='{worker_name}' and ENVIRONMENT='{environment}'")
PYTHON

echo "Done"
