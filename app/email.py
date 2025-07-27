import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app, url_for
import os

def send_email(to_email, subject, html_content, text_content=None):
    """Send email using configured SMTP settings"""
    
    # Get email configuration from environment variables
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_username = os.getenv('SMTP_USERNAME')
    smtp_password = os.getenv('SMTP_PASSWORD')
    from_email = os.getenv('FROM_EMAIL', smtp_username)
    
    if not all([smtp_server, smtp_username, smtp_password]):
        current_app.logger.error("Email configuration missing")
        return False
    
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = from_email
        message["To"] = to_email
        
        # Add text version if provided
        if text_content:
            text_part = MIMEText(text_content, "plain")
            message.attach(text_part)
        
        # Add HTML version
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Create secure connection and send email
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_username, smtp_password)
            server.sendmail(from_email, to_email, message.as_string())
        
        current_app.logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        current_app.logger.error(f"Failed to send email: {str(e)}")
        return False

def send_password_reset_email(user, token):
    """Send password reset email to user"""
    
    reset_url = url_for('auth.reset_password', token=token.token, _external=True)
    
    subject = "Workout Tracker - Password Reset Request"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #0d6efd; margin-bottom: 30px;">🏋️ Workout Tracker</h1>
            <h2 style="color: #495057; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
                Hello <strong>{user.username}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 30px;">
                We received a request to reset your password. Click the button below to set a new password:
            </p>
            
            <a href="{reset_url}" style="background-color: #0d6efd; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 30px;">
                Reset Password
            </a>
            
            <p style="font-size: 14px; color: #6c757d; margin-bottom: 20px;">
                This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="font-size: 14px; color: #6c757d; margin-bottom: 20px;">
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6c757d;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{reset_url}" style="color: #0d6efd; word-break: break-all;">{reset_url}</a>
            </p>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Workout Tracker - Password Reset Request
    
    Hello {user.username},
    
    We received a request to reset your password. Copy and paste the following link into your browser to set a new password:
    
    {reset_url}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
    """
    
    return send_email(user.email, subject, html_content, text_content)
