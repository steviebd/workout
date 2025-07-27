#!/bin/bash

# Database Access Helper Script
# Provides secure database access for development and maintenance

set -e

# Load environment variables
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please run ./setup_security.sh first"
    exit 1
fi

source .env

echo "🔗 Database Access Helper"
echo "========================"
echo ""

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "⚠️  Containers not running. Starting them..."
    docker-compose up -d
    echo "⏳ Waiting for database to be ready..."
    sleep 10
fi

echo "Available commands:"
echo "1. Connect to database (psql)"
echo "2. View database logs"
echo "3. Backup database"
echo "4. Show database stats"
echo "5. Exit"
echo ""

read -p "Choose option (1-5): " choice

case $choice in
    1)
        echo "🔑 Connecting to database as ${POSTGRES_USER}..."
        docker-compose exec db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
        ;;
    2)
        echo "📋 Database logs:"
        docker-compose logs db
        ;;
    3)
        echo "💾 Creating database backup..."
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose exec db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > ${BACKUP_FILE}
        echo "✅ Backup created: ${BACKUP_FILE}"
        ;;
    4)
        echo "📊 Database statistics:"
        docker-compose exec db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "
        SELECT 
            schemaname,
            tablename,
            attname,
            n_distinct,
            correlation
        FROM pg_stats 
        WHERE schemaname = 'public' 
        LIMIT 10;
        "
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please choose 1-5."
        exit 1
        ;;
esac
