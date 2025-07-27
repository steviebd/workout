#!/bin/bash

# Fix .env file permissions for mounted volume
chown appuser:appuser /app/.env 2>/dev/null || true

echo "Waiting for PostgreSQL to be ready..."
while ! pg_isready -h ${DB_HOST:-db} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres}; do
    sleep 1
done

echo "PostgreSQL is ready!"

# Initialize database
echo "Initializing database..."
flask db upgrade

# Create admin user if no users exist and credentials are provided
echo "Checking for admin user..."
python3 -c "
import os
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    admin_username = os.environ.get('ADMIN_USERNAME')
    admin_password = os.environ.get('ADMIN_PASSWORD')
    force_password_change = os.environ.get('FORCE_ADMIN_PASSWORD_CHANGE', 'false').lower() == 'true'
    database_fresh_start = os.environ.get('DATABASE_FRESH_START', 'true').lower() == 'true'
    
    user_count = User.query.count()
    
    if user_count == 0 and admin_username and admin_password and database_fresh_start:
        print(f'Creating admin user: {admin_username}')
        admin = User(username=admin_username, is_admin=True)
        admin.set_password(admin_password)
        admin.force_password_change = force_password_change
        db.session.add(admin)
        db.session.commit()
        print(f'Admin user created: {admin_username}')
        if force_password_change:
            print('Admin will be forced to change password on first login')
    elif user_count == 0 and not database_fresh_start:
        print('Existing database preserved - no users found but DATABASE_FRESH_START=false')
        print('This may indicate a data migration issue')
    elif user_count == 0:
        print('No admin credentials provided in environment variables')
        print('Please set ADMIN_USERNAME and ADMIN_PASSWORD environment variables')
    else:
        print(f'Found {user_count} existing users - preserving existing user accounts')
        print('No new admin user will be created')
"

echo "Starting Flask application..."
exec su-exec appuser python3 workout_app.py
