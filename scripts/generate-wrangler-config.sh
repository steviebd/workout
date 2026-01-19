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

SECRETS_JSON=$(infisical secrets --env "$INFISICAL_ENV" --output json 2>/dev/null || echo "[]")

ENVIRONMENT=$(echo "$SECRETS_JSON" | python3 -c "import json, sys; d=json.load(sys.stdin); print(next((item['secretValue'] for item in d if item.get('secretKey')=='ENVIRONMENT'), '$TARGET_ENV'))" 2>/dev/null || echo "$TARGET_ENV")

case "$ENVIRONMENT" in
  dev)
    WORKER_NAME="workout-dev"
    DB_NAME="workout-dev-db"
    DB_ID="00000000-0000-0000-0000-000000000000"
    REMOTE="false"
    ;;
  staging)
    WORKER_NAME="workout-staging"
    DB_NAME="workout-staging-db"
    DB_ID=$(echo "$SECRETS_JSON" | python3 -c "import json, sys; d=json.load(sys.stdin); print(next((item['secretValue'] for item in d if item.get('secretKey')=='CLOUDFLARE_D1_DATABASE_ID'), ''))" 2>/dev/null || echo "")
    REMOTE="true"
    ;;
  production)
    WORKER_NAME="workout-prod"
    DB_NAME="workout-prod-db"
    DB_ID=$(echo "$SECRETS_JSON" | python3 -c "import json, sys; d=json.load(sys.stdin); print(next((item['secretValue'] for item in d if item.get('secretKey')=='CLOUDFLARE_D1_DATABASE_ID'), ''))" 2>/dev/null || echo "")
    REMOTE="true"
    ;;
  *)
    WORKER_NAME="workout-${ENVIRONMENT}"
    DB_NAME="workout-${ENVIRONMENT}-db"
    DB_ID=$(echo "$SECRETS_JSON" | python3 -c "import json, sys; d=json.load(sys.stdin); print(next((item['secretValue'] for item in d if item.get('secretKey')=='CLOUDFLARE_D1_DATABASE_ID'), ''))" 2>/dev/null || echo "")
    REMOTE="true"
    ;;
esac

if [ "$ENVIRONMENT" != "dev" ] && [ -z "$DB_ID" ]; then
  echo "Error: Could not retrieve CLOUDFLARE_D1_DATABASE_ID for '$INFISICAL_ENV'"
  exit 1
fi

python3 - "$CONFIG_FILE" "$WORKER_NAME" "$DB_NAME" "$DB_ID" "$REMOTE" "$ENVIRONMENT" "$SECRETS_JSON" << 'PYTHON'
import json
import sys

config_path = sys.argv[1]
worker_name = sys.argv[2]
db_name = sys.argv[3]
db_id = sys.argv[4]
remote = sys.argv[5]
environment = sys.argv[6]
secrets_json = sys.argv[7]

secrets = {}
try:
    data = json.loads(secrets_json) if secrets_json else []
    for item in data:
        if isinstance(item, dict) and 'secretKey' in item:
            key = item['secretKey']
            value = item.get('secretValue', '')
            if value:
                secrets[key] = value
except json.JSONDecodeError:
    pass

vars_lines = []
vars_lines.append(f'ENVIRONMENT = "{environment}"')

for key, value in sorted(secrets.items()):
    if key.startswith('CLOUDFLARE_') or key.startswith('INFISICAL_'):
        continue
    if key == 'ENVIRONMENT':
        continue
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
