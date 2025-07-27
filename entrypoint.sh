#!/bin/bash

echo "Waiting for PostgreSQL to be ready..."
while ! pg_isready -h db -p 5432 -U postgres; do
    sleep 1
done

echo "PostgreSQL is ready!"

# Initialize database
echo "Initializing database..."
flask db upgrade

# Create admin user if no users exist
echo "Checking for admin user..."
python3 -c "
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    if User.query.count() == 0:
        print('Creating default admin user...')
        admin = User(username='admin', is_admin=True)
        admin.set_password('admin')
        db.session.add(admin)
        db.session.commit()
        print('Admin user created: username=admin, password=admin')
    else:
        print('Users already exist, skipping admin creation')
"

echo "Starting Flask application..."
python3 workout_app.py
