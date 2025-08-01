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
- **Run tests**: `pytest` (run all tests)
- **Run tests with coverage**: `pytest --cov=app --cov-report=term-missing`
- **Run specific test types**: `pytest -m unit` (unit tests only), `pytest -m integration` (integration tests only)
- **Run tests verbosely**: `pytest -v`
- **Check code quality**: `python3 check_code_quality.py` (check for missing type hints, docstrings, etc.)

## Architecture
- **Stack**: Flask app with PostgreSQL, deployed via Docker Compose
- **Structure**: Blueprint-based modular Flask app (auth, workout_templates, workouts, settings, main) with separated models and config packages
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
