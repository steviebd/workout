#!/bin/bash

# Security Status Check Script
# Verifies that security fixes are properly implemented

echo "🔒 Workout Tracker Security Status Check"
echo "========================================"
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ Environment configuration (.env) exists"
else
    echo "❌ Environment configuration (.env) missing - run ./setup_security.sh"
    exit 1
fi

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Application containers are running"
    
    # Check database port exposure
    if docker-compose ps | grep -q "5432->"; then
        echo "❌ CRITICAL: Database port 5432 is exposed to host!"
    else
        echo "✅ Database port is NOT exposed (secure)"
    fi
    
    # Check network isolation
    if docker network ls | grep -q "workout.*internal"; then
        echo "✅ Internal network isolation is configured"
    else
        echo "⚠️  Internal network may not be properly configured"
    fi
    
    # Check PostgreSQL configuration
    if [ -f "postgresql.conf" ]; then
        echo "✅ PostgreSQL security configuration exists"
        
        # Check for problematic settings
        if grep -q "log_failed_connections" postgresql.conf; then
            echo "❌ PostgreSQL config contains invalid parameters"
        else
            echo "✅ PostgreSQL configuration is compatible"
        fi
    else
        echo "⚠️  PostgreSQL security configuration missing"
    fi
    
    # Test database accessibility
    echo ""
    echo "🔍 Testing Database Security:"
    echo "----------------------------"
    
    # Test internal connectivity (should work)
    if docker-compose exec -T web pg_isready -h db -p 5432 -U postgres >/dev/null 2>&1; then
        echo "✅ Application can connect to database internally"
    else
        echo "❌ Application cannot connect to database"
    fi
    
    # Test external connectivity (should fail)
    if timeout 2 nc -z localhost 5432 >/dev/null 2>&1; then
        echo "❌ CRITICAL: Database is accessible from host (security risk!)"
    else
        echo "✅ Database is NOT accessible from host (secure)"
    fi
    
else
    echo "⚠️  Application containers are not running"
    echo "   Run: docker-compose up -d"
fi

echo ""
echo "🛡️  Security Features Status:"
echo "----------------------------"

# Check application security features
if docker-compose logs web 2>/dev/null | grep -q "flask_limiter"; then
    echo "✅ Rate limiting is enabled"
else
    echo "⚠️  Rate limiting status unknown"
fi

if docker-compose logs web 2>/dev/null | grep -q "force_password_change"; then
    echo "✅ Forced password change is enabled"
else
    echo "⚠️  Forced password change status unknown"
fi

# Check for debug mode
if docker-compose logs web 2>/dev/null | grep -q "Debug mode: on"; then
    echo "⚠️  Debug mode is ON (development mode)"
else
    echo "✅ Debug mode is OFF (production mode)"
fi

echo ""
echo "📋 Quick Actions:"
echo "----------------"
echo "• Access application: http://localhost:8080"
echo "• Database access: ./db_access.sh"
echo "• Database management: ./reset_database.sh"
echo "• View logs: docker-compose logs"
echo "• Security setup: ./setup_security.sh"

# Check database setup status
echo ""
echo "🗃️  Database Setup Status:"
echo "-------------------------"
if [ -f ".env" ] && grep -q "DATABASE_FRESH_START" .env; then
    db_fresh=$(grep "DATABASE_FRESH_START" .env | cut -d'=' -f2)
    if [ "$db_fresh" = "true" ]; then
        echo "✅ Fresh database setup (new installation)"
    else
        echo "📊 Existing database preserved (data retained)"
    fi
else
    echo "⚠️  Database setup status unknown"
fi
echo ""
echo "Security check completed! 🔒"
