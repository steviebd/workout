#!/bin/bash

set -euo pipefail

TARGET_ENV=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      TARGET_ENV="$2"
      shift 2
      ;;
    dev|staging|production)
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

# Map 'prod' to 'production' for wrangler compatibility
WRANGLER_ENV="$TARGET_ENV"
if [ "$TARGET_ENV" = "prod" ]; then
  WRANGLER_ENV="production"
fi

CONFIG_FILE="wrangler.toml"
TEMPLATE_FILE="wrangler.template.toml"
BACKUP_FILE="${CONFIG_FILE}.backup"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Error: Template file not found: $TEMPLATE_FILE"
  exit 1
fi

if [ -f "$CONFIG_FILE" ]; then
  if ! grep -q '^\[env\.' "$CONFIG_FILE" 2>/dev/null; then
    rm -f "$CONFIG_FILE"
    echo "Removed old-format $CONFIG_FILE"
  fi
fi

if [ ! -f "$CONFIG_FILE" ]; then
  cp "$TEMPLATE_FILE" "$CONFIG_FILE"
  echo "Seeded $CONFIG_FILE from $TEMPLATE_FILE"
fi

echo "Updating $CONFIG_FILE for env '$WRANGLER_ENV' with Infisical secrets..."

SECRETS_JSON=$(infisical secrets --env "$TARGET_ENV" --output json 2>/dev/null || echo "[]")

D1_DB_ID="${CLOUDFLARE_D1_DATABASE_ID:-}"

if [ -z "$D1_DB_ID" ]; then
  D1_DB_ID=$(echo "$SECRETS_JSON" | python3 -c "import json, sys; data=json.load(sys.stdin); print(next((item['secretValue'] for item in data if item.get('secretKey')=='CLOUDFLARE_D1_DATABASE_ID'), ''))" 2>/dev/null || true)
fi

if [ -z "$D1_DB_ID" ]; then
  echo "Error: Could not retrieve CLOUDFLARE_D1_DATABASE_ID from Infisical for '$TARGET_ENV' (wrangler env: '$WRANGLER_ENV')"
  exit 1
fi

cp "$CONFIG_FILE" "$BACKUP_FILE"

SECRETS_JSON=$(infisical secrets --env "$TARGET_ENV" --output json 2>/dev/null || echo "[]")

python3 - "$CONFIG_FILE" "$TARGET_ENV" "$D1_DB_ID" "$SECRETS_JSON" <<'PYTHON'
import json
import os
import re
import sys

config_path, target_env, db_id, secrets_json = sys.argv[1:5]

secrets = {}
try:
    secrets_list = json.loads(secrets_json) if secrets_json else []
    for item in secrets_list:
        if isinstance(item, dict) and "secretKey" in item and "secretValue" in item:
            secrets[item["secretKey"]] = item["secretValue"]
except json.JSONDecodeError:
    pass

with open(config_path, "r", encoding="utf-8") as f:
    content = f.read()

placeholder_pattern = re.compile(r"\{\{\s*([A-Z0-9_]+)\s*\}\}")

def replace_placeholder(match):
    key = match.group(1)
    env_value = os.environ.get(key)
    if env_value is not None:
        return env_value
    return secrets.get(key, match.group(0))

content = placeholder_pattern.sub(replace_placeholder, content)

db_pattern = re.compile(rf'(\[\[env\.{re.escape(target_env)}\.d1_databases\]\][^\[]*?database_id\s*=\s*")([^"]*)(")', re.DOTALL)
if not db_pattern.search(content):
    raise SystemExit(f"Could not locate env.{target_env} D1 configuration in {config_path}")

content = db_pattern.sub(lambda m: f"{m.group(1)}{db_id}{m.group(3)}", content)

var_names = ["WORKOS_API_KEY", "WORKOS_CLIENT_ID"]

missing_vars = []
for name in var_names:
    value = os.environ.get(name) or secrets.get(name, "")
    if not value:
        missing_vars.append(name)
    
    var_pattern = re.compile(rf'^({re.escape(name)}\s*=\s*).*$', re.MULTILINE)
    if var_pattern.search(content):
        content = var_pattern.sub(rf'\1{json.dumps(value)}', content)

vars_pattern = re.compile(rf'(  \[env\.{re.escape(target_env)}\.vars\]\n(?:  [^\n]*\n)*)', re.MULTILINE)
vars_match = vars_pattern.search(content)

if vars_match:
    block_lines = [f"  [env.{target_env}.vars]"]
    for name in var_names:
        value = os.environ.get(name) or secrets.get(name, "")
        block_lines.append(f"  {name} = {json.dumps(value)}")
    block_lines.append("")
    block = "\n".join(block_lines)
    content = content[:vars_match.start(1)] + block + content[vars_match.end(1):]

# Add top-level D1 binding for Cloudflare Vite plugin (it only reads top-level config)
# Find the position after compatibility_flags and before [observability]
top_level_d1 = f'''
[[d1_databases]]
binding = "DB"
database_name = "workout-{target_env}-db"
database_id = "{db_id}"
'''

# Check if top-level d1_databases already exists
if not re.search(r'^\[\[d1_databases\]\]', content, re.MULTILINE):
    # Insert before [observability]
    obs_match = re.search(r'\n\[observability\]', content)
    if obs_match:
        content = content[:obs_match.start()] + top_level_d1 + content[obs_match.start():]
else:
    # Update existing top-level D1 config
    top_level_db_pattern = re.compile(r'(\[\[d1_databases\]\][^\[]*?database_id\s*=\s*")([^"]*)(")', re.DOTALL)
    content = top_level_db_pattern.sub(lambda m: f"{m.group(1)}{db_id}{m.group(3)}", content)

with open(config_path, "w", encoding="utf-8") as f:
    f.write(content)

if missing_vars:
    print(f"Warning: Missing env vars: {', '.join(missing_vars)}")

print(f"Updated $CONFIG_FILE for env '{target_env}'")
PYTHON

echo "Done"
