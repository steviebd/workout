# Security Setup Guide

This guide walks you through the secure setup of the Workout Tracker application after implementing security fixes.

## ⚠️ Important Security Changes

The application has been updated with critical security improvements. **You must run the security setup script before starting the application.**

## Quick Start

1. **Run the Security Setup Script**
   ```bash
   ./setup_security.sh
   ```

2. **Build and Start the Application**
   ```bash
   docker-compose up --build
   ```

## Detailed Setup Instructions

### 1. Security Setup Script

The `setup_security.sh` script will:
- Generate secure random passwords and secret keys
- Create environment variables for all sensitive data
- Configure production vs development settings
- Set up admin user credentials
- Apply secure file permissions

Run the script:
```bash
chmod +x setup_security.sh
./setup_security.sh
```

**Script Options:**
- **Production Environment (Y)**: Disables debug mode, enables HTTPS enforcement, applies strict security headers
- **Testing/Development (n)**: Enables debug mode, relaxed security for development

### 2. Generated Files

After running the script, you'll have:
- `.env` file with secure environment variables
- Updated `.gitignore` to exclude `.env`

**Never commit the `.env` file to version control!**

### 3. Security Features Implemented

#### Critical Fixes ✅
- ✅ **Removed hardcoded credentials** - No more default admin/admin
- ✅ **Environment-controlled debug mode** - Production-safe configuration
- ✅ **Secure secret management** - All secrets in environment variables

#### High Priority Fixes ✅
- ✅ **Input validation** - Comprehensive validation for all user inputs
- ✅ **Strong password policy** - Minimum 12 characters with complexity requirements
- ✅ **HTTPS enforcement** - Configurable HTTPS redirection and security headers

#### Medium Priority Fixes ✅
- ✅ **CSRF protection** - Flask-WTF CSRF tokens on all forms
- ✅ **Non-root container** - Application runs as unprivileged user
- ✅ **Security headers** - Content Security Policy, HSTS, and other security headers

#### Low Priority Fixes ✅
- ✅ **Rate limiting** - Protection against brute force attacks
- ✅ **Secure database credentials** - Environment-based database configuration

## Environment Variables Reference

### Security Configuration
```bash
SECRET_KEY=<generated-secret-key>
JWT_SECRET_KEY=<generated-jwt-secret>
FLASK_DEBUG=False  # Set to True for development
FLASK_ENV=production  # Set to development for dev
```

### Database Configuration
```bash
DB_HOST=db
DB_PORT=5432
DB_NAME=workout_tracker
DB_USER=postgres
DB_PASSWORD=<generated-password>
DATABASE_URL=postgresql://user:pass@db:5432/dbname
```

### Admin User Configuration
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<generated-password>
FORCE_ADMIN_PASSWORD_CHANGE=true
```

### Security Settings
```bash
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
PERMANENT_SESSION_LIFETIME=3600
FORCE_HTTPS=True
```

## First Login

1. **Access the application** at `http://localhost:8080`
2. **Login with generated credentials** (shown after setup script)
3. **Change admin password** (forced on first login)

## Production Deployment Checklist

### Before Deployment
- [ ] Run security setup script with Production=Y
- [ ] Verify `.env` file contains production settings
- [ ] Ensure `FLASK_DEBUG=False`
- [ ] Set strong, unique passwords
- [ ] Configure HTTPS certificates

### AWS EKS Deployment
- [ ] Use AWS Secrets Manager for environment variables
- [ ] Configure Pod Security Standards (restricted)
- [ ] Implement Network Policies
- [ ] Enable audit logging
- [ ] Configure KMS encryption for data at rest

### Security Monitoring
- [ ] Set up log monitoring for authentication failures
- [ ] Configure alerting for suspicious activity
- [ ] Regular security scans and updates
- [ ] Monitor rate limit violations

## Security Best Practices

### Password Management
- Use generated passwords (recommended)
- Minimum 12 characters with complexity
- Regular password rotation
- Force password change for new users

### Environment Management
- Never commit `.env` files
- Use secrets management in production
- Rotate keys regularly
- Separate environments (dev/staging/prod)

### Application Security
- Keep dependencies updated
- Regular security reviews
- Monitor application logs
- Implement proper error handling

## Troubleshooting

### Common Issues

**Error: "No admin credentials provided"**
- Ensure `.env` file contains `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- Verify environment variables are loaded correctly

**Login fails with valid credentials**
- Check if `force_password_change` is set to true
- Verify password complexity requirements
- Check rate limiting (too many failed attempts)

**HTTPS redirect not working**
- Verify `FORCE_HTTPS=True` in environment
- Check if running behind a load balancer/proxy
- For development, set `FORCE_HTTPS=False`

### Getting Help

1. Check application logs: `docker-compose logs web`
2. Verify environment variables: `docker-compose exec web env | grep -E "(SECRET|ADMIN|DB)"`
3. Review security_review.md for detailed findings

## Security Contacts

For security issues:
- Review the `security_review.md` file
- Check OWASP guidelines for web application security
- Consult AWS security best practices for EKS deployments

---

**Remember**: Security is an ongoing process. Regularly review and update your security configurations, monitor for vulnerabilities, and keep dependencies up to date.
