# Workout Tracker - Agent Guide

## Commands
- **Run App**: `python3 workout_app.py` or `docker-compose up --build`
- **Database migrations**: `flask db upgrade` (or `docker-compose exec web flask db upgrade`)
- **Security setup**: `./setup_security.sh` (required for first run)
- **Email setup**: `./setup_email.sh` (optional - enables password reset via email)
- **Test email**: `python3 test_email_config.py` (test email configuration)
- **Database access**: `./db_access.sh` or `docker-compose exec db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}`
- **Reset database**: `./reset_database.sh`
- **Check security**: `./check_security.sh`
- **No test commands** - project has no test framework setup

## Architecture
- **Stack**: Flask app with PostgreSQL, deployed via Docker Compose
- **Structure**: Blueprint-based modular Flask app (auth, templates, workouts, settings, main)
- **Database**: PostgreSQL with SQLAlchemy ORM, Flask-Migrate for migrations
- **Security**: Flask-Talisman (headers), Flask-Limiter (rate limiting), Flask-WTF (CSRF), Flask-Login (auth)
- **Frontend**: Bootstrap 5 dark theme, vanilla JS, mobile-first design

## Code Style
- **Imports**: Flask extensions first, then app modules, then models
- **Models**: SQLAlchemy declarative with explicit `__tablename__`, relationships with cascades
- **Routes**: Blueprint organization, use `@login_required` decorator, CSRF protection on forms
- **Naming**: Snake_case for variables/functions, PascalCase for classes, descriptive model field names
- **Error handling**: Use Flask flash messages, redirect after POST, validate all inputs
- **Security**: Environment variables for secrets, never hardcode credentials, use Werkzeug password hashing
