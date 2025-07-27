#!/bin/bash

# Database Reset Script
# Provides options to reset or backup the database

set -e

echo "🗃️  Database Management Tool"
echo "=========================="
echo ""

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo "⚠️  Application is currently running"
    read -p "Stop the application to manage database? (Y/n): " stop_app
    if [[ ! "$stop_app" =~ ^[Nn]$ ]]; then
        echo "🛑 Stopping application..."
        docker-compose down
    else
        echo "❌ Cannot manage database while application is running"
        exit 1
    fi
fi

echo "Database Management Options:"
echo "1. 📊 Backup current database"
echo "2. 🗑️  Delete database (DESTRUCTIVE - creates backup first)"
echo "3. 📈 Show database information"
echo "4. 🔄 Reset database with fresh setup"
echo "5. ❌ Cancel"
echo ""

read -p "Choose option (1-5): " choice

case $choice in
    1)
        echo "📊 Creating database backup..."
        
        # Start only the database container
        docker-compose up -d db
        sleep 5
        
        # Create backup
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose exec db pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-workout_tracker} > ${BACKUP_FILE}
        
        echo "✅ Backup created: ${BACKUP_FILE}"
        docker-compose down
        ;;
        
    2)
        echo "🗑️  Database Deletion with Backup"
        echo "================================"
        echo ""
        echo "⚠️  This will:"
        echo "   1. Create a backup of your current database"
        echo "   2. Delete the database volume"
        echo "   3. Require you to run setup_security.sh again"
        echo ""
        read -p "Continue with database deletion? (y/N): " confirm_delete
        
        if [[ "$confirm_delete" =~ ^[Yy]$ ]]; then
            # Create backup first
            echo "📊 Creating backup before deletion..."
            docker-compose up -d db
            sleep 5
            
            BACKUP_FILE="backup_before_deletion_$(date +%Y%m%d_%H%M%S).sql"
            docker-compose exec db pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-workout_tracker} > ${BACKUP_FILE}
            echo "✅ Backup created: ${BACKUP_FILE}"
            
            # Stop and remove
            docker-compose down
            docker volume rm workout_pgdata 2>/dev/null || true
            docker volume rm $(docker volume ls -q | grep pgdata) 2>/dev/null || true
            
            echo "✅ Database deleted"
            echo ""
            echo "📝 Next steps:"
            echo "1. Run: ./setup_security.sh"
            echo "2. Choose to create a fresh database"
            echo "3. Start the application: docker-compose up --build"
        else
            echo "❌ Database deletion cancelled"
        fi
        ;;
        
    3)
        echo "📈 Database Information"
        echo "====================="
        
        # Check for volumes
        if docker volume ls | grep -q "pgdata"; then
            echo "✅ Database volume exists:"
            docker volume ls | grep pgdata
            
            # Try to get database info
            echo ""
            echo "📊 Attempting to get database info..."
            if docker-compose up -d db >/dev/null 2>&1; then
                sleep 5
                echo ""
                docker-compose exec db psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-workout_tracker} -c "
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes
                FROM pg_stat_user_tables
                ORDER BY schemaname, tablename;
                " 2>/dev/null || echo "⚠️  Could not connect to database"
                
                docker-compose down >/dev/null 2>&1
            else
                echo "⚠️  Could not start database container"
            fi
        else
            echo "❌ No database volume found"
        fi
        ;;
        
    4)
        echo "🔄 Complete Database Reset"
        echo "========================"
        echo ""
        echo "⚠️  This will:"
        echo "   1. Create a backup of your current database (if exists)"
        echo "   2. Delete the database volume completely"
        echo "   3. Automatically run setup_security.sh for fresh setup"
        echo ""
        read -p "Continue with complete reset? (y/N): " confirm_reset
        
        if [[ "$confirm_reset" =~ ^[Yy]$ ]]; then
            # Create backup if database exists
            if docker volume ls | grep -q "pgdata"; then
                echo "📊 Creating backup before reset..."
                docker-compose up -d db >/dev/null 2>&1
                sleep 5
                
                BACKUP_FILE="backup_before_reset_$(date +%Y%m%d_%H%M%S).sql"
                docker-compose exec db pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-workout_tracker} > ${BACKUP_FILE} 2>/dev/null
                echo "✅ Backup created: ${BACKUP_FILE}"
                
                docker-compose down >/dev/null 2>&1
            fi
            
            # Remove database
            docker volume rm workout_pgdata 2>/dev/null || true
            docker volume rm $(docker volume ls -q | grep pgdata) 2>/dev/null || true
            
            echo "✅ Database reset complete"
            echo ""
            echo "🚀 Running security setup for fresh database..."
            ./setup_security.sh
        else
            echo "❌ Database reset cancelled"
        fi
        ;;
        
    5)
        echo "❌ Operation cancelled"
        exit 0
        ;;
        
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "Database management completed! 🗃️"
