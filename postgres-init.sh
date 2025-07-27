#!/bin/bash
# PostgreSQL initialization script for SSL setup

set -e

# Fix data directory permissions
chown -R postgres:postgres /var/lib/postgresql/data
chmod 700 /var/lib/postgresql/data

# Initialize database if needed
if [ ! -f "/var/lib/postgresql/data/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database..."
    gosu postgres initdb --auth-host=scram-sha-256 --auth-local=trust
    
    # Set postgres user password to match environment variable
    echo "Setting postgres user password..."
    gosu postgres postgres --single -D /var/lib/postgresql/data postgres <<EOF
ALTER USER postgres PASSWORD '$POSTGRES_PASSWORD';
EOF
    echo "✓ Postgres user password set"
    
    # Create the workout_tracker database
    echo "Creating workout_tracker database..."
    gosu postgres postgres --single -D /var/lib/postgresql/data postgres <<EOF
CREATE DATABASE ${POSTGRES_DB:-workout_tracker};
EOF
    echo "✓ Database ${POSTGRES_DB:-workout_tracker} created"
fi

# Check if SSL certificates exist
SSL_CERT="/var/lib/postgresql/ssl/server.crt"
SSL_KEY="/var/lib/postgresql/ssl/server.key"

if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    echo "SSL certificates found. Starting PostgreSQL with SSL enabled."
    # Start PostgreSQL with SSL configuration as postgres user
    exec gosu postgres postgres -c config_file=/etc/postgresql/postgresql.conf
else
    echo "SSL certificates not found. Starting PostgreSQL without SSL."
    echo "Run ./setup_security.sh to generate SSL certificates."
    
    # Create a temporary config without SSL for initial setup
    cp /etc/postgresql/postgresql.conf /tmp/postgresql-no-ssl.conf
    sed -i 's/ssl = on/ssl = off/g' /tmp/postgresql-no-ssl.conf
    sed -i '/ssl_cert_file/d' /tmp/postgresql-no-ssl.conf
    sed -i '/ssl_key_file/d' /tmp/postgresql-no-ssl.conf
    sed -i '/ssl_ca_file/d' /tmp/postgresql-no-ssl.conf
    sed -i '/ssl_min_protocol_version/d' /tmp/postgresql-no-ssl.conf
    
    # Start PostgreSQL without SSL as postgres user
    exec gosu postgres postgres -c config_file=/tmp/postgresql-no-ssl.conf
fi
