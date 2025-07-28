"""
Authentication service for handling user authentication logic.
"""
from typing import Optional, Tuple, Dict, Any
from flask import url_for
from flask_login import login_user, logout_user

from app.models import User, PasswordResetToken
from app.validators import validate_user_data, ValidationError
from app.email import send_password_reset_email
from .base_service import BaseService

class AuthService(BaseService):
    """Service for handling authentication operations."""
    
    def login_user(self, username: str, password: str) -> Tuple[bool, Optional[User], Dict[str, Any]]:
        """
        Authenticate user with username and password.
        
        Args:
            username: User's username
            password: User's password
            
        Returns:
            Tuple of (success, user, context) where context contains:
            - error_message: Error message if login failed
            - force_password_change: Whether user must change password
            - redirect_url: URL to redirect to after login
        """
        # Basic validation
        if not username or not password:
            return False, None, {'error_message': 'Username and password required'}
        
        username = username.strip()
        
        # Validate username format
        if len(username) > 50:
            return False, None, {'error_message': 'Invalid credentials'}
        
        try:
            user = User.query.filter_by(username=username).first()
            
            if user and user.check_password(password):
                login_user(user)
                self.log_info(f"User {username} logged in successfully")
                
                context = {'success': True}
                
                # Check if password change is required
                if hasattr(user, 'force_password_change') and user.force_password_change:
                    context['force_password_change'] = True
                    context['redirect_url'] = url_for('settings.change_password_page')
                else:
                    context['redirect_url'] = url_for('main.dashboard')
                
                return True, user, context
            else:
                self.log_info(f"Failed login attempt for username: {username}")
                return False, None, {'error_message': 'Invalid credentials'}
                
        except Exception as e:
            self.log_error(f"Login error for user {username}: {str(e)}")
            return False, None, {'error_message': 'Login failed'}
    
    def logout_user(self) -> bool:
        """
        Log out the current user.
        
        Returns:
            bool: True if successful
        """
        try:
            logout_user()
            return True
        except Exception as e:
            self.log_error(f"Logout error: {str(e)}")
            return False
    
    def register_user(self, username: str, email: str, password: str) -> Tuple[bool, Optional[User], str]:
        """
        Register a new user.
        
        Args:
            username: Desired username
            email: User's email address
            password: User's password
            
        Returns:
            Tuple of (success, user, message)
        """
        try:
            # Validate user data
            validate_user_data({'username': username, 'email': email, 'password': password})
            
            # Check if username exists
            if User.query.filter_by(username=username).first():
                return False, None, 'Username already exists'
            
            # Check if email exists
            if email and User.query.filter_by(email=email).first():
                return False, None, 'Email already registered'
            
            # Create new user
            user = User(username=username, email=email)
            user.set_password(password)
            
            if self.safe_add(user) and self.commit_changes():
                self.log_info(f"New user registered: {username}")
                return True, user, 'User registered successfully'
            else:
                return False, None, 'Registration failed'
                
        except ValidationError as e:
            return False, None, str(e)
        except Exception as e:
            self.log_error(f"Registration error: {str(e)}")
            return False, None, 'Registration failed'
    
    def request_password_reset(self, email: str) -> Tuple[bool, str]:
        """
        Request a password reset for the given email.
        
        Args:
            email: User's email address
            
        Returns:
            Tuple of (success, message)
        """
        if not email:
            return False, 'Email address required'
        
        email = email.strip().lower()
        
        try:
            user = User.query.filter_by(email=email).first()
            
            if user:
                # Generate reset token
                reset_token = PasswordResetToken.generate_token(user)
                
                # Send reset email
                if send_password_reset_email(user.email, reset_token.token):
                    self.log_info(f"Password reset requested for {email}")
                    return True, 'Password reset instructions sent to your email'
                else:
                    return False, 'Failed to send reset email'
            else:
                # Don't reveal if email exists for security
                return True, 'If this email is registered, you will receive reset instructions'
                
        except Exception as e:
            self.log_error(f"Password reset error for {email}: {str(e)}")
            return False, 'Password reset request failed'
    
    def reset_password(self, token: str, new_password: str) -> Tuple[bool, str]:
        """
        Reset password using a reset token.
        
        Args:
            token: Password reset token
            new_password: New password
            
        Returns:
            Tuple of (success, message)
        """
        if not token or not new_password:
            return False, 'Token and new password required'
        
        try:
            # Validate password
            validate_user_data({'password': new_password})
            
            reset_token = PasswordResetToken.query.filter_by(token=token).first()
            
            if not reset_token or not reset_token.is_valid():
                return False, 'Invalid or expired reset token'
            
            # Update password
            user = reset_token.user
            user.set_password(new_password)
            user.force_password_change = False  # Clear forced password change
            
            # Mark token as used
            reset_token.use_token()
            
            if self.commit_changes():
                self.log_info(f"Password reset successful for user {user.username}")
                return True, 'Password reset successfully'
            else:
                return False, 'Password reset failed'
                
        except ValidationError as e:
            return False, str(e)
        except Exception as e:
            self.log_error(f"Password reset error: {str(e)}")
            return False, 'Password reset failed'
    
    def change_password(self, user: User, current_password: str, new_password: str) -> Tuple[bool, str]:
        """
        Change user's password.
        
        Args:
            user: User instance
            current_password: Current password
            new_password: New password
            
        Returns:
            Tuple of (success, message)
        """
        if not current_password or not new_password:
            return False, 'Current and new password required'
        
        try:
            # Verify current password
            if not user.check_password(current_password):
                return False, 'Current password is incorrect'
            
            # Validate new password
            validate_user_data({'password': new_password})
            
            # Update password
            user.set_password(new_password)
            user.force_password_change = False  # Clear forced password change
            
            if self.commit_changes():
                self.log_info(f"Password changed for user {user.username}")
                return True, 'Password changed successfully'
            else:
                return False, 'Password change failed'
                
        except ValidationError as e:
            return False, str(e)
        except Exception as e:
            self.log_error(f"Password change error for user {user.username}: {str(e)}")
            return False, 'Password change failed'
