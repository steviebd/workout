#!/usr/bin/env python3
"""
Email Configuration Test Script for Workout Tracker
This script tests email functionality without running the full application.
"""

import smtplib
import ssl
import os
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

def load_config():
    """Load email configuration from .env file"""
    if not os.path.exists('.env'):
        print("❌ .env file not found. Run ./setup_email.sh first.")
        return None
    
    load_dotenv()
    
    config = {
        'smtp_server': os.getenv('SMTP_SERVER'),
        'smtp_port': int(os.getenv('SMTP_PORT', 587)),
        'smtp_username': os.getenv('SMTP_USERNAME'),
        'smtp_password': os.getenv('SMTP_PASSWORD'),
        'from_email': os.getenv('FROM_EMAIL')
    }
    
    # Validate required fields
    required_fields = ['smtp_server', 'smtp_username', 'smtp_password']
    missing_fields = [field for field in required_fields if not config[field]]
    
    if missing_fields:
        print(f"❌ Missing required configuration: {', '.join(missing_fields)}")
        print("Run ./setup_email.sh to configure email settings.")
        return None
    
    if not config['from_email']:
        config['from_email'] = config['smtp_username']
    
    return config

def test_email_connection(config):
    """Test SMTP connection without sending email"""
    try:
        print(f"🔌 Testing connection to {config['smtp_server']}:{config['smtp_port']}...")
        
        context = ssl.create_default_context()
        with smtplib.SMTP(config['smtp_server'], config['smtp_port']) as server:
            server.starttls(context=context)
            server.login(config['smtp_username'], config['smtp_password'])
            print("✅ SMTP connection successful!")
            return True
            
    except smtplib.SMTPAuthenticationError:
        print("❌ Authentication failed. Check username/password.")
        print("For Gmail/Outlook, make sure you're using an App Password, not your regular password.")
        return False
    except smtplib.SMTPConnectError:
        print(f"❌ Cannot connect to {config['smtp_server']}:{config['smtp_port']}")
        print("Check your SMTP server and port settings.")
        return False
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False

def send_test_email(config, recipient):
    """Send a test email"""
    try:
        print(f"📧 Sending test email to {recipient}...")
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Workout Tracker - Email Configuration Test"
        message["From"] = config['from_email']
        message["To"] = recipient
        
        text_content = """
🏋️ Workout Tracker - Email Test

This is a test email from your Workout Tracker application.

✅ SUCCESS: Email configuration is working correctly!

You can now use the password reset functionality:
1. Users can set their email in Settings > Profile
2. Use "Forgot Password?" on the login page
3. Receive secure password reset links

Configuration Details:
- SMTP Server: {}
- SMTP Port: {}
- From Email: {}

If you have any issues, check the application logs with:
docker-compose logs web
        """.format(config['smtp_server'], config['smtp_port'], config['from_email'])
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .success {{ background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                .info {{ background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                h1 {{ color: #0d6efd; }}
                h2 {{ color: #495057; }}
                .emoji {{ font-size: 1.2em; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1><span class="emoji">🏋️</span> Workout Tracker - Email Test</h1>
                
                <div class="success">
                    <h2><span class="emoji">✅</span> SUCCESS: Email configuration is working!</h2>
                    <p>This test email confirms that your Workout Tracker application can send emails.</p>
                </div>
                
                <h3>Password Reset Functionality</h3>
                <p>Users can now:</p>
                <ol>
                    <li>Set their email address in <strong>Settings > Profile</strong></li>
                    <li>Use <strong>"Forgot Password?"</strong> on the login page</li>
                    <li>Receive secure password reset links</li>
                </ol>
                
                <div class="info">
                    <h3>Configuration Details</h3>
                    <ul>
                        <li><strong>SMTP Server:</strong> {config['smtp_server']}</li>
                        <li><strong>SMTP Port:</strong> {config['smtp_port']}</li>
                        <li><strong>From Email:</strong> {config['from_email']}</li>
                    </ul>
                </div>
                
                <p><small>If you experience any issues, check the application logs with: <code>docker-compose logs web</code></small></p>
            </div>
        </body>
        </html>
        """
        
        # Add text and HTML parts
        text_part = MIMEText(text_content, "plain")
        html_part = MIMEText(html_content, "html")
        
        message.attach(text_part)
        message.attach(html_part)
        
        # Send email
        context = ssl.create_default_context()
        with smtplib.SMTP(config['smtp_server'], config['smtp_port']) as server:
            server.starttls(context=context)
            server.login(config['smtp_username'], config['smtp_password'])
            server.sendmail(config['from_email'], recipient, message.as_string())
        
        print("✅ Test email sent successfully!")
        print(f"📬 Check your inbox at {recipient}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send test email: {str(e)}")
        return False

def main():
    print("🏋️  Workout Tracker - Email Configuration Test")
    print("=" * 50)
    print()
    
    # Load configuration
    config = load_config()
    if not config:
        sys.exit(1)
    
    print("📋 Current email configuration:")
    print(f"   SMTP Server: {config['smtp_server']}")
    print(f"   SMTP Port: {config['smtp_port']}")
    print(f"   Username: {config['smtp_username']}")
    print(f"   From Email: {config['from_email']}")
    print()
    
    # Test connection
    if not test_email_connection(config):
        print("\n🔧 To reconfigure email settings, run: ./setup_email.sh")
        sys.exit(1)
    
    print()
    
    # Ask for test email
    test_choice = input("Would you like to send a test email? (y/n): ").strip().lower()
    
    if test_choice in ['y', 'yes']:
        recipient = input("Enter recipient email address: ").strip()
        
        if not recipient:
            print("❌ No recipient provided.")
            sys.exit(1)
        
        print()
        if send_test_email(config, recipient):
            print("\n🎉 Email test completed successfully!")
            print("\nNext steps:")
            print("1. Restart your application: docker-compose restart web")
            print("2. Users can now set emails in Settings > Profile")
            print("3. Password reset functionality is ready to use")
        else:
            print("\n🔧 To reconfigure email settings, run: ./setup_email.sh")
            sys.exit(1)
    else:
        print("\n✅ Connection test passed. Email configuration is valid.")
        print("To send test emails later, run this script again.")

if __name__ == "__main__":
    main()
