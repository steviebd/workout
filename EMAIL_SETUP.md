# Email Setup Guide for Workout Tracker

This guide will help you configure email functionality for password resets in the Workout Tracker application.

## Quick Setup

Run the automated setup script:

```bash
./setup_email.sh
```

This script will:
- Guide you through email provider configuration
- Update your `.env` file with SMTP settings
- Test the email configuration
- Provide provider-specific instructions

## Manual Setup

### 1. Environment Variables

Add these variables to your `.env` file:

```env
SMTP_SERVER=your-smtp-server.com
SMTP_PORT=587
SMTP_USERNAME=your-email@domain.com
SMTP_PASSWORD=your-password-or-app-password
FROM_EMAIL=your-email@domain.com
```

### 2. Popular Email Providers

#### Gmail Setup

1. **Enable 2-Factor Authentication** on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Create an App Password for "Mail"
4. Use these settings:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-16-character-app-password
FROM_EMAIL=your-gmail@gmail.com
```

#### Outlook/Hotmail Setup

1. **Enable 2-Factor Authentication** on your Microsoft account
2. Go to [Microsoft Security](https://account.microsoft.com/security)
3. Create an App Password
4. Use these settings:

```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@outlook.com
```

#### Other Providers

Common SMTP settings for other providers:

| Provider | SMTP Server | Port | Security |
|----------|-------------|------|----------|
| Yahoo | smtp.mail.yahoo.com | 587 | TLS |
| iCloud | smtp.mail.me.com | 587 | TLS |
| SendGrid | smtp.sendgrid.net | 587 | TLS |
| Mailgun | smtp.mailgun.org | 587 | TLS |

## Testing Email Configuration

### Option 1: Use the Test Script

```bash
python3 test_email_config.py
```

This script will:
- Validate your email configuration
- Test SMTP connection
- Send a test email
- Provide troubleshooting tips

### Option 2: Manual Testing

1. Start the application:
   ```bash
   docker-compose up
   ```

2. Set an email address in user settings
3. Try the "Forgot Password?" feature

## Troubleshooting

### Common Issues

#### Authentication Failed
- **Gmail/Outlook**: Make sure you're using an App Password, not your regular password
- **Other providers**: Check if 2FA is required and app passwords are needed

#### Connection Timeout
- Check firewall settings
- Verify SMTP server and port
- Some ISPs block port 25, try port 587 or 465

#### SSL/TLS Errors
- Most modern providers require TLS (port 587)
- Port 465 uses SSL
- Port 25 is usually unencrypted (not recommended)

### Checking Logs

View application logs for email-related errors:

```bash
docker-compose logs web | grep -i email
```

### Testing SMTP Connection

You can test SMTP connection manually:

```bash
telnet smtp.gmail.com 587
```

## Security Best Practices

1. **Use App Passwords**: Never use your main email password
2. **Enable 2FA**: Required for most email providers
3. **Environment Variables**: Store credentials in `.env`, not in code
4. **Firewall**: Ensure outbound SMTP ports are allowed
5. **Rate Limiting**: The app includes built-in rate limiting for password resets

## Features After Setup

Once email is configured, users can:

1. **Set Email in Profile**: Go to Settings > Profile Settings
2. **Password Reset**: Use "Forgot Password?" on login page
3. **Secure Tokens**: Reset links expire in 1 hour and are single-use
4. **Admin Management**: Admins can set user emails during user creation

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SMTP_SERVER` | Yes | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | Yes | SMTP server port | `587` |
| `SMTP_USERNAME` | Yes | Email username | `user@gmail.com` |
| `SMTP_PASSWORD` | Yes | Email password/app password | `abcd efgh ijkl mnop` |
| `FROM_EMAIL` | No | From address (defaults to username) | `noreply@mycompany.com` |

## Support

If you continue having issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review application logs
3. Test with the provided scripts
4. Verify your email provider's documentation

The email functionality is optional - the app works fine without it, but users won't be able to reset passwords via email.
