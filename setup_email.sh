#!/bin/bash

# Email Setup Script for Workout Tracker
# This script helps configure and test email functionality

set -e

echo "🏋️  Workout Tracker - Email Setup"
echo "=================================="
echo

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    touch .env
fi

echo "This script will help you configure email functionality for password resets."
echo "You'll need access to an SMTP email server (Gmail, Outlook, etc.)"
echo

# Function to update or add environment variable
update_env_var() {
    local key=$1
    local value=$2
    local env_file=".env"
    
    if grep -q "^${key}=" "$env_file" 2>/dev/null; then
        # Update existing variable
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^${key}=.*/${key}=${value}/" "$env_file"
        else
            sed -i "s/^${key}=.*/${key}=${value}/" "$env_file"
        fi
    else
        # Add new variable
        echo "${key}=${value}" >> "$env_file"
    fi
}

# Function to show provider-specific instructions
show_provider_instructions() {
    local provider=$1
    
    case $provider in
        "gmail")
            echo "📧 Gmail Setup Instructions:"
            echo "1. Enable 2-factor authentication on your Google account"
            echo "2. Go to https://myaccount.google.com/apppasswords"
            echo "3. Create an 'App Password' for 'Mail'"
            echo "4. Use this app password (not your regular Gmail password)"
            echo "5. SMTP Server: smtp.gmail.com"
            echo "6. SMTP Port: 587"
            echo
            ;;
        "outlook")
            echo "📧 Outlook/Hotmail Setup Instructions:"
            echo "1. Enable 2-factor authentication on your Microsoft account"
            echo "2. Go to https://account.microsoft.com/security"
            echo "3. Create an 'App Password'"
            echo "4. Use this app password (not your regular password)"
            echo "5. SMTP Server: smtp-mail.outlook.com"
            echo "6. SMTP Port: 587"
            echo
            ;;
        "custom")
            echo "📧 Custom SMTP Setup:"
            echo "You'll need to get SMTP settings from your email provider"
            echo "Common ports: 587 (TLS), 465 (SSL), 25 (plain)"
            echo
            ;;
    esac
}

# Get email provider choice
echo "Select your email provider:"
echo "1) Gmail"
echo "2) Outlook/Hotmail"
echo "3) Custom SMTP server"
echo
read -p "Enter choice (1-3): " provider_choice

case $provider_choice in
    1)
        provider="gmail"
        default_server="smtp.gmail.com"
        default_port="587"
        ;;
    2)
        provider="outlook"
        default_server="smtp-mail.outlook.com"
        default_port="587"
        ;;
    3)
        provider="custom"
        default_server=""
        default_port="587"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

show_provider_instructions $provider

# Get SMTP server
if [ -n "$default_server" ]; then
    read -p "SMTP Server [$default_server]: " smtp_server
    smtp_server=${smtp_server:-$default_server}
else
    read -p "SMTP Server: " smtp_server
fi

# Get SMTP port
read -p "SMTP Port [$default_port]: " smtp_port
smtp_port=${smtp_port:-$default_port}

# Get email credentials
read -p "Email address: " email_address
echo "Enter email password (for Gmail/Outlook, use App Password):"
read -s email_password
echo

# Get from email (optional)
read -p "From email address [$email_address]: " from_email
from_email=${from_email:-$email_address}

# Update .env file
echo "Updating .env file..."
update_env_var "SMTP_SERVER" "$smtp_server"
update_env_var "SMTP_PORT" "$smtp_port"
update_env_var "SMTP_USERNAME" "$email_address"
update_env_var "SMTP_PASSWORD" "$email_password"
update_env_var "FROM_EMAIL" "$from_email"

echo "✅ Email configuration saved to .env file"
echo

# Test email configuration
echo "Would you like to test the email configuration? (y/n)"
read -p "Test email: " test_choice

if [[ $test_choice == "y" || $test_choice == "Y" ]]; then
    read -p "Enter test recipient email: " test_recipient
    
    echo "Testing email configuration..."
    
    # Create a temporary Python script to test email
    cat > test_email.py << EOF
import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def test_email():
    smtp_server = "$smtp_server"
    smtp_port = $smtp_port
    smtp_username = "$email_address"
    smtp_password = "$email_password"
    from_email = "$from_email"
    to_email = "$test_recipient"
    
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Workout Tracker - Email Test"
        message["From"] = from_email
        message["To"] = to_email
        
        text = """
        This is a test email from your Workout Tracker application.
        
        If you received this email, your email configuration is working correctly!
        
        You can now use password reset functionality.
        """
        
        html = """
        <html>
        <body>
            <h2>🏋️ Workout Tracker - Email Test</h2>
            <p>This is a test email from your Workout Tracker application.</p>
            <p><strong>✅ Email configuration is working correctly!</strong></p>
            <p>You can now use password reset functionality.</p>
        </body>
        </html>
        """
        
        text_part = MIMEText(text, "plain")
        html_part = MIMEText(html, "html")
        
        message.attach(text_part)
        message.attach(html_part)
        
        # Send email
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_username, smtp_password)
            server.sendmail(from_email, to_email, message.as_string())
        
        print("✅ Test email sent successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send test email: {str(e)}")
        return False

if __name__ == "__main__":
    test_email()
EOF
    
    # Run the test
    if command -v python3 &> /dev/null; then
        python3 test_email.py
    elif command -v python &> /dev/null; then
        python test_email.py
    else
        echo "❌ Python not found. Cannot test email configuration."
        echo "Please install Python to test email functionality."
    fi
    
    # Clean up
    rm -f test_email.py
fi

echo
echo "🎉 Email setup complete!"
echo
echo "Configuration saved:"
echo "- SMTP Server: $smtp_server"
echo "- SMTP Port: $smtp_port"
echo "- Username: $email_address"
echo "- From Email: $from_email"
echo
echo "To restart the application with new settings:"
echo "  docker-compose restart web"
echo
echo "Users can now:"
echo "1. Set their email address in Settings > Profile"
echo "2. Use 'Forgot Password?' on the login page"
echo "3. Receive password reset emails"
echo
echo "For troubleshooting, check the application logs:"
echo "  docker-compose logs web"
