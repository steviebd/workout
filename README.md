# Workout Tracker

A secure, single-container web application for tracking workouts with reusable templates. Built with Flask, PostgreSQL, and Bootstrap with a dark theme design optimized for mobile devices.

## 🚨 Security Notice

**This application has been hardened with enterprise-grade security features. You MUST run the security setup script before first use.**

## Features

- **Secure Authentication**: Login system with rate limiting and strong password policies
- **Workout Templates**: Create reusable workout templates with exercises
- **Workout Sessions**: Start workouts from templates with last-recorded values pre-filled
- **History Tracking**: View and edit past workout sessions
- **User Management**: Admin users can manage other users with secure controls
- **Mobile-First Design**: Dark Bootstrap theme optimized for touch devices
- **Security Hardened**: CSRF protection, input validation, security headers, and more

## 🔐 Security Features

- **Strong Password Policy**: Minimum 12 characters with complexity requirements
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive validation to prevent injection attacks
- **CSRF Protection**: Cross-Site Request Forgery protection on all forms
- **Security Headers**: HSTS, CSP, and other security headers
- **Secure Sessions**: HTTP-only, secure cookies with proper expiration
- **Container Security**: Runs as non-root user with minimal privileges
- **Environment-based Secrets**: No hardcoded credentials in code

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenSSL (for secure key generation)

### Secure Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd workout-tracker
   ```

2. **Run the Security Setup Script** ⚠️ **REQUIRED**
   ```bash
   chmod +x setup_security.sh
   ./setup_security.sh
   ```
   
   The script will:
   - Check for existing database and offer deletion/preservation options
   - Generate secure random passwords and secret keys
   - Create the `.env` file with proper configuration
   - Set up admin user credentials (for new databases only)
   - Configure production vs development settings

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Open your browser to `http://localhost:8080`
   - Login with the credentials generated by the setup script
   - **You will be forced to change the admin password on first login**

### ⚠️ Important Security Notes

- **Never skip the setup script** - The application will not work properly without it
- **Save generated passwords securely** - The setup script will show you the credentials
- **Change default passwords** - You'll be forced to change the admin password on first login
- **Use HTTPS in production** - The setup script configures this automatically

### Development Setup

For development without Docker:

1. **Run the security setup script first**
   ```bash
   ./setup_security.sh
   # Choose 'n' for Testing/Development environment
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up PostgreSQL database**
   ```bash
   # DATABASE_URL is configured in .env by the setup script
   ```

4. **Initialize database**
   ```bash
   export FLASK_APP=workout_app.py
   flask db upgrade
   ```

5. **Run the application**
   ```bash
   python3 workout_app.py
   ```

   The admin user will be created automatically using the credentials from your `.env` file.

## Usage

### Templates
- Create workout templates with exercises
- Set default weights, reps, and sets for each exercise
- Edit or delete existing templates

### Workouts
- Start a new workout session from any template
- Exercise values are pre-filled with last recorded data
- All fields are editable with touch-friendly number steppers
- Add notes to workout sessions

### History
- View paginated list of past workouts
- Click to view and edit previous sessions
- See workout date, template used, and exercise count

### Settings
- Change your password
- **Admin users only**: Manage other users (add, edit, delete)

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Templates
- `GET /templates/templates` - List user's templates
- `POST /templates/templates` - Create new template
- `PUT /templates/templates/<id>` - Update template
- `DELETE /templates/templates/<id>` - Delete template

### Workouts
- `POST /workouts/workouts/start` - Start new workout from template
- `GET /workouts/workouts/<id>` - Get workout details
- `PUT /workouts/workouts/<id>` - Update workout session
- `GET /workouts/workouts/history` - Get workout history (paginated)

### Settings
- `POST /settings/settings/password` - Change password
- `GET /settings/admin/users` - List users (admin only)
- `POST /settings/admin/users` - Create user (admin only)
- `PUT /settings/admin/users/<id>` - Update user (admin only)
- `DELETE /settings/admin/users/<id>` - Delete user (admin only)

## Database Schema

### Users
- `id` (Primary Key)
- `username` (Unique)
- `password_hash`
- `is_admin` (Boolean)
- `force_password_change` (Boolean) - Forces password change on next login

### Templates
- `id` (Primary Key)
- `user_id` (Foreign Key → users.id)
- `name`
- `created_at`

### Template Exercises
- `id` (Primary Key)
- `template_id` (Foreign Key → templates.id)
- `exercise_name`
- `default_weight`
- `default_reps`
- `default_sets`
- `order_index`

### Workouts
- `id` (Primary Key)
- `user_id` (Foreign Key → users.id)
- `template_id` (Foreign Key → templates.id, nullable)
- `performed_at`
- `notes`

### Workout Exercises
- `id` (Primary Key)
- `workout_id` (Foreign Key → workouts.id)
- `exercise_name`
- `weight`
- `reps`
- `sets`
- `order_index`

## Technology Stack

- **Backend**: Flask, SQLAlchemy, Flask-Login, Flask-Migrate, Flask-WTF, Flask-Talisman, Flask-Limiter
- **Database**: PostgreSQL 15
- **Frontend**: Bootstrap 5 (dark theme), vanilla JavaScript
- **Security**: CSRF protection, input validation, rate limiting, security headers
- **Containerization**: Docker, Docker Compose

## Configuration

Environment variables are managed by the security setup script. Key variables include:

### Security Configuration
- `SECRET_KEY` - Flask secret key for sessions (auto-generated)
- `JWT_SECRET_KEY` - JWT secret for future use (auto-generated)
- `FLASK_DEBUG` - Enable/disable debug mode
- `FLASK_ENV` - Environment setting (production/development)

### Database Configuration  
- `DATABASE_URL` - PostgreSQL connection string
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database settings

### Admin User Configuration
- `ADMIN_USERNAME` - Admin username
- `ADMIN_PASSWORD` - Admin password (auto-generated)
- `FORCE_ADMIN_PASSWORD_CHANGE` - Force password change on first login

### Security Settings
- `SESSION_COOKIE_SECURE` - Secure cookie settings
- `FORCE_HTTPS` - HTTPS enforcement
- `RATELIMIT_STORAGE_URL` - Rate limiting configuration

## Enhanced Security Features

- **Password Security**: Werkzeug password hashing with strong policy enforcement
- **Session Management**: Secure, HTTP-only cookies with proper expiration
- **Authentication**: Rate-limited login with account lockout protection
- **Authorization**: Admin-only routes with proper access control
- **Input Validation**: Comprehensive server-side validation for all inputs
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries
- **CSRF Protection**: Flask-WTF CSRF tokens on all forms
- **XSS Prevention**: Input sanitization and Content Security Policy
- **Security Headers**: HSTS, CSP, X-Frame-Options, and more via Flask-Talisman
- **Rate Limiting**: Request throttling to prevent abuse
- **Container Security**: Non-root user execution with minimal privileges

## Mobile Optimization

- Touch-friendly interface with large buttons
- Number steppers for easy value adjustment
- Sticky bottom navigation
- Mobile-first responsive design
- Dark theme for better battery life

## Administration

### User Management
Admin users can:
- Add new users with custom usernames and passwords
- Toggle admin privileges for users
- Reset user passwords
- Delete users (except themselves)

### Admin Account Setup
- **Credentials**: Generated securely by the setup script
- **First Login**: You will be forced to change the password
- **Security**: No default credentials - all passwords are randomly generated
- **Important**: Save the generated credentials shown by the setup script

## Backup & Maintenance

### Database Access

For development, use the helper script:
```bash
./db_access.sh
```

Or connect directly:
```bash
docker-compose exec db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

### Database Management

For database management operations:
```bash
./reset_database.sh
```

Options include:
- Create database backup
- Delete database with backup
- Show database information  
- Complete database reset with fresh setup

### Database Backup
```bash
./db_access.sh  # Choose option 3 for backup
# Or manually:
docker-compose exec db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup.sql
```

### Database Restore
```bash
docker-compose exec -T db psql -U ${POSTGRES_USER} ${POSTGRES_DB} < backup.sql
```

### Update Application
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **"No admin credentials provided" error**
   - Ensure you ran the security setup script: `./setup_security.sh`
   - Check that `.env` file exists and contains `ADMIN_USERNAME` and `ADMIN_PASSWORD`
   - Verify environment variables are loaded correctly

2. **Database connection errors**
   - Ensure PostgreSQL container is running
   - Check DATABASE_URL configuration in `.env` file

3. **Permission denied on entrypoint.sh**
   ```bash
   chmod +x entrypoint.sh
   ```

4. **Login fails with "Invalid credentials"**
   - Use the credentials shown by the setup script
   - Check if you need to change the password (forced on first login)
   - Verify rate limiting isn't blocking you (wait a few minutes)

5. **HTTPS redirect not working in development**
   - Run setup script and choose 'n' for Testing/Development
   - Or set `FORCE_HTTPS=False` in your `.env` file

6. **Missing migrations**
   ```bash
   docker-compose exec web flask db upgrade
   ```

7. **Existing database with wrong credentials**
   - Run `./reset_database.sh` and choose option 4 for complete reset
   - Or run `./setup_security.sh` and choose to delete existing database

8. **Want to start fresh but preserve data**
   - Run `./reset_database.sh` and choose option 1 to backup first
   - Then run setup script and choose to delete database
   - Restore from backup later if needed

### Logs
```bash
# View application logs
docker-compose logs web

# View database logs
docker-compose logs db

# Follow logs in real-time
docker-compose logs -f
```

## 🔒 Security Resources

For detailed security information, see:
- `security_review.md` - Comprehensive security assessment and findings
- `SECURITY_SETUP.md` - Detailed security setup guide
- `setup_security.sh` - Security configuration script

### Security Best Practices

1. **Regular Updates**: Keep dependencies updated regularly
2. **Password Management**: Use the generated passwords and change them periodically
3. **Environment Separation**: Use different credentials for dev/staging/production
4. **Monitoring**: Monitor logs for suspicious activity and failed login attempts
5. **Backups**: Regular secure backups of the database
6. **HTTPS**: Always use HTTPS in production environments

### Production Deployment

For production deployment:
1. Run setup script with Production=Y
2. Use AWS Secrets Manager or similar for environment variables
3. Configure proper HTTPS certificates
4. Set up monitoring and alerting
5. Implement proper backup and disaster recovery
6. Regular security audits and penetration testing

## License

This project is licensed under the MIT License.
