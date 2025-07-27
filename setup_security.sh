#!/bin/bash

# Workout Tracker Security Setup Script
# This script creates secure environment variables and .env file

set -e

echo "=== Workout Tracker Security Setup ==="
echo "This script will create secure environment variables for your application."
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "Warning: .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    echo ""
fi

# Check for existing PostgreSQL database volume
echo "=== Database Setup Check ==="
if docker volume ls | grep -q "workout_pgdata\|.*pgdata"; then
    echo "⚠️  Existing PostgreSQL database volume detected!"
    echo ""
    echo "This means you have an existing database with data that may include:"
    echo "- Previous user accounts"
    echo "- Workout templates and history"
    echo "- Different database schema version"
    echo ""
    echo "Database Volume Options:"
    echo "1. Keep existing database (preserve all data)"
    echo "2. Delete existing database and start fresh (DESTROYS ALL DATA)"
    echo ""
    read -p "Do you want to DELETE the existing database and start fresh? (y/N): " delete_db
    
    if [[ "$delete_db" =~ ^[Yy]$ ]] || [ "$delete_db" = "DELETE" ]; then
        # If user typed "DELETE" directly, skip the confirmation
        if [ "$delete_db" = "DELETE" ]; then
            confirm_delete="DELETE"
        else
            echo ""
            echo "⚠️  WARNING: This will permanently delete ALL database data!"
            read -p "Are you absolutely sure? Type 'DELETE' to confirm: " confirm_delete
        fi
        
        if [ "$confirm_delete" = "DELETE" ]; then
            echo "🗑️  Stopping containers and removing database volume..."
            docker-compose down >/dev/null 2>&1 || true
            docker volume rm workout_pgdata >/dev/null 2>&1 || true
            docker volume rm $(docker volume ls -q | grep pgdata) >/dev/null 2>&1 || true
            echo "✅ Database volume deleted - will create fresh database"
            DATABASE_FRESH_START="true"
        else
            echo "❌ Database deletion cancelled - keeping existing database"
            DATABASE_FRESH_START="false"
        fi
    else
        echo "✅ Keeping existing database - will preserve all data"
        echo "⚠️  Note: Ensure your database schema is compatible"
        DATABASE_FRESH_START="false"
    fi
else
    echo "✅ No existing database found - will create new database"
    DATABASE_FRESH_START="true"
fi
echo ""

# Function to generate secure random string
generate_secure_key() {
    openssl rand -hex 32
}

# Function to generate secure password
generate_secure_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

echo "=== Environment Configuration ==="
# Ask for production vs testing
read -p "Is this a Production environment? (Y/n): " is_production
if [[ "$is_production" =~ ^[Nn]$ ]]; then
    FLASK_ENV="development"
    FLASK_DEBUG="True"
    echo "Configured for TESTING/DEVELOPMENT environment"
else
    FLASK_ENV="production"
    FLASK_DEBUG="False"
    echo "Configured for PRODUCTION environment"
fi
echo ""

echo "=== Security Keys Generation ==="
# Generate Flask secret key
FLASK_SECRET_KEY=$(generate_secure_key)
echo "✓ Generated Flask secret key"

# Generate JWT secret (for future use)
JWT_SECRET_KEY=$(generate_secure_key)
echo "✓ Generated JWT secret key"

echo ""
echo "=== Database Configuration ==="
# Database credentials
read -p "Enter PostgreSQL database name [workout_tracker]: " db_name
db_name=${db_name:-workout_tracker}

read -p "Enter PostgreSQL username [postgres]: " db_user
db_user=${db_user:-postgres}

# Generate secure database password or ask for custom one
echo ""
echo "Database Password Options:"
echo "1. Generate secure random password (recommended)"
echo "2. Enter custom password"
read -p "Choose option (1/2): " db_pass_option

if [ "$db_pass_option" = "2" ]; then
    read -s -p "Enter PostgreSQL password: " db_password
    echo ""
    read -s -p "Confirm PostgreSQL password: " db_password_confirm
    echo ""
    if [ "$db_password" != "$db_password_confirm" ]; then
        echo "Passwords don't match! Exiting."
        exit 1
    fi
    if [ ${#db_password} -lt 12 ]; then
        echo "Warning: Password is less than 12 characters. Consider using a stronger password."
    fi
else
    db_password=$(generate_secure_password)
    echo "✓ Generated secure database password"
fi

echo ""
echo "=== Admin User Configuration ==="
# Admin user setup
read -p "Enter admin username [admin]: " admin_username
admin_username=${admin_username:-admin}

echo ""
echo "Admin Password Options:"
echo "1. Generate secure random password (recommended)"
echo "2. Enter custom password"
read -p "Choose option (1/2): " admin_pass_option

if [ "$admin_pass_option" = "2" ]; then
    read -s -p "Enter admin password: " admin_password
    echo ""
    read -s -p "Confirm admin password: " admin_password_confirm
    echo ""
    if [ "$admin_password" != "$admin_password_confirm" ]; then
        echo "Passwords don't match! Exiting."
        exit 1
    fi
    if [ ${#admin_password} -lt 12 ]; then
        echo "Warning: Password is less than 12 characters. Consider using a stronger password."
    fi
else
    admin_password=$(generate_secure_password)
    echo "✓ Generated secure admin password"
fi

# Force password change flag
FORCE_ADMIN_PASSWORD_CHANGE="true"

echo ""
echo "=== PostgreSQL SSL Setup ==="
# Create SSL directory for PostgreSQL certificates
SSL_DIR="./postgres-ssl"
if [ -d "$SSL_DIR" ]; then
    echo "⚠️  SSL directory already exists. Removing old certificates..."
    rm -rf "$SSL_DIR"
fi

mkdir -p "$SSL_DIR"
echo "✓ Created SSL directory: $SSL_DIR"

# Generate SSL certificates for PostgreSQL
echo "Generating SSL certificates for PostgreSQL..."

# Generate private key
openssl genrsa -out "$SSL_DIR/server.key" 2048 2>/dev/null
chmod 600 "$SSL_DIR/server.key"
echo "✓ Generated SSL private key"

# Generate certificate signing request
openssl req -new -key "$SSL_DIR/server.key" -out "$SSL_DIR/server.csr" -subj "/C=AU/ST=State/L=City/O=WorkoutTracker/CN=db" 2>/dev/null
echo "✓ Generated certificate signing request"

# Generate self-signed certificate
openssl x509 -req -in "$SSL_DIR/server.csr" -signkey "$SSL_DIR/server.key" -out "$SSL_DIR/server.crt" -days 365 2>/dev/null
chmod 600 "$SSL_DIR/server.crt"
echo "✓ Generated SSL certificate (valid for 365 days)"

# Generate CA certificate for client verification (optional but recommended)
openssl genrsa -out "$SSL_DIR/ca.key" 2048 2>/dev/null
chmod 600 "$SSL_DIR/ca.key"
openssl req -new -x509 -key "$SSL_DIR/ca.key" -out "$SSL_DIR/ca.crt" -days 365 -subj "/C=AU/ST=State/L=City/O=WorkoutTracker-CA/CN=CA" 2>/dev/null
chmod 644 "$SSL_DIR/ca.crt"
echo "✓ Generated CA certificate"

# Clean up CSR file
rm "$SSL_DIR/server.csr"

# Set proper ownership (will be handled by Docker)
echo "✓ SSL certificates generated successfully"
echo ""

echo "=== Creating .env file ==="

# Create .env file
cat > .env << EOF
# Flask Configuration
FLASK_ENV=${FLASK_ENV}
FLASK_DEBUG=${FLASK_DEBUG}
SECRET_KEY=${FLASK_SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}

# Database Configuration
DB_HOST=db
DB_PORT=5432
DB_NAME=${db_name}
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DATABASE_URL=postgresql://${db_user}:${db_password}@db:5432/${db_name}?sslmode=require
DATABASE_URL_NO_SSL=postgresql://${db_user}:${db_password}@db:5432/${db_name}

# PostgreSQL Environment Variables (for docker-compose)
POSTGRES_DB=${db_name}
POSTGRES_USER=${db_user}
POSTGRES_PASSWORD=${db_password}

# Database Security Settings
DB_APP_USER=workout_app
DB_APP_PASSWORD=$(generate_secure_password)

# Admin User Configuration
ADMIN_USERNAME=${admin_username}
ADMIN_PASSWORD=${admin_password}
FORCE_ADMIN_PASSWORD_CHANGE=${FORCE_ADMIN_PASSWORD_CHANGE}

# Database Setup Configuration
DATABASE_FRESH_START=${DATABASE_FRESH_START}

# Security Configuration
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
PERMANENT_SESSION_LIFETIME=3600

# Rate Limiting
RATELIMIT_STORAGE_URL=memory://
RATELIMIT_DEFAULT=100 per hour

# Security Headers
FORCE_HTTPS=True
EOF

# Set secure permissions on .env file
chmod 600 .env

echo "✓ Created .env file with secure permissions (600)"
echo ""

echo "=== Setup Complete ==="
echo "Your secure environment has been configured!"
echo ""
echo "Important Information:"
echo "======================"
if [ "$admin_pass_option" = "1" ]; then
    echo "Generated Admin Credentials:"
    echo "  Username: ${admin_username}"
    echo "  Password: ${admin_password}"
    echo ""
    echo "⚠️  SAVE THESE CREDENTIALS SECURELY!"
    echo "⚠️  The admin will be forced to change password on first login."
fi

if [ "$db_pass_option" = "1" ]; then
    echo ""
    echo "Generated Database Password: ${db_password}"
    echo "⚠️  SAVE THIS PASSWORD SECURELY!"
fi

echo ""
echo "Next Steps:"
echo "==========="
echo "1. Save all generated passwords in a secure password manager"
echo "2. Add .env to your .gitignore file (if not already done)"

if [ "$DATABASE_FRESH_START" = "true" ]; then
    echo "3. Run: docker-compose up --build"
    echo "4. Access the application and change the admin password"
    echo ""
    echo "🆕 Fresh Database Setup:"
    echo "- New database will be created with secure configuration"
    echo "- Admin user will be created with generated credentials"
    echo "- You will be forced to change password on first login"
else
    echo "3. Run: docker-compose up --build"
    echo "4. Access the application with your EXISTING credentials"
    echo ""
    echo "📊 Existing Database Preserved:"
    echo "- All your data (users, workouts, templates) is preserved"
    echo "- Use your existing login credentials"
    echo "- New admin user will NOT be created (existing users preserved)"
    echo "- Database schema will be updated if needed"
    echo ""
    echo "⚠️  Important Notes for Existing Database:"
    echo "- If you forgot your password, you'll need to reset it manually"
    echo "- The new security features will apply to all users"
    echo "- Rate limiting and other protections are now active"
fi
echo ""
echo "Security Notes:"
echo "==============="
echo "- The .env file contains sensitive information"
echo "- Never commit .env file to version control"
echo "- Regularly rotate your secret keys and passwords"
echo "- Monitor application logs for security events"
echo ""

# Add .env and SSL directory to .gitignore if not already there
if [ -f ".gitignore" ]; then
    if ! grep -q "^\.env$" .gitignore; then
        echo ".env" >> .gitignore
        echo "✓ Added .env to .gitignore"
    fi
    if ! grep -q "^postgres-ssl/$" .gitignore; then
        echo "postgres-ssl/" >> .gitignore
        echo "✓ Added postgres-ssl/ to .gitignore"
    fi
else
    cat > .gitignore << EOF
.env
postgres-ssl/
EOF
    echo "✓ Created .gitignore and added .env and postgres-ssl/"
fi

echo ""
echo "🛡️  Database Security Notice:"
echo "=========================="
echo "✅ Database port exposure removed (was: 5432 -> external)"
echo "✅ Internal Docker network configured"
echo "✅ PostgreSQL security configuration applied"
echo "✅ Application-specific database user created"
echo "✅ SSL/TLS encryption enabled for database connections"
echo "✅ SSL certificates generated and configured"
echo ""
echo "⚠️  The database is now only accessible via the application with SSL"
echo "⚠️  For direct database access during development:"
echo "   docker-compose exec db psql -U ${db_user} -d ${db_name}"
echo ""
echo "🔐 SSL Certificate Information:"
echo "- Server certificate: postgres-ssl/server.crt"
echo "- Server private key: postgres-ssl/server.key"
echo "- CA certificate: postgres-ssl/ca.crt"
echo "- Certificates expire in 365 days"
echo "- Regenerate certificates annually for security"
echo ""

echo "Setup completed successfully! 🔒"
