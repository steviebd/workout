#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

ENV=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --env)
            ENV="$2"
            shift 2
            ;;
        dev|staging|prod)
            ENV="$1"
            shift
            ;;
        *)
            echo "Error: Unknown argument: $1"
            echo "Usage: $0 [--env dev|staging|prod]"
            exit 1
            ;;
    esac
done

if [ -z "$ENV" ]; then
    ENV="${ENVIRONMENT}"
fi

if [ -z "$ENV" ]; then
    echo "Error: ENVIRONMENT env var not set and no environment argument provided"
    echo "Usage: $0 [--env dev|staging|prod]"
    exit 1
fi

case "$ENV" in
    dev|staging|prod)
        ;;
    *)
        echo "Error: Invalid environment '$ENV'. Must be one of: dev, staging, prod"
        exit 1
        ;;
esac

echo "Generating wrangler.toml for environment: $ENV"

CLOUDFLARE_D1_DATABASE_ID=$(infisical secrets get CLOUDFLARE_D1_DATABASE_ID --env "$ENV" --plain 2>/dev/null)

if [ -z "$CLOUDFLARE_D1_DATABASE_ID" ]; then
    echo "Error: Could not get CLOUDFLARE_D1_DATABASE_ID from Infisical for env: $ENV"
    exit 1
fi

TEMPLATE_FILE="$PROJECT_DIR/wrangler.template.toml"
OUTPUT_FILE="$PROJECT_DIR/wrangler.toml"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file not found: $TEMPLATE_FILE"
    exit 1
fi

sed -e "s/\${ENVIRONMENT}/$ENV/g" \
    -e "s/\${CLOUDFLARE_D1_DATABASE_ID}/$CLOUDFLARE_D1_DATABASE_ID/g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo "Generated: $OUTPUT_FILE"
echo "Database: workout-$ENV-db"
