"""
Unit tests for AuthService.
"""
import pytest
from datetime import datetime, timedelta

from app.services.auth_service import AuthService
from app.models import User, PasswordResetToken
from app.core import db
from tests.factories import UserFactory, PasswordResetTokenFactory

class TestAuthService:
    """Test cases for AuthService."""
    
    def test_login_user_success(self, app, test_user):
        """Test successful user login."""
        with app.app_context():
            user = User.query.get(test_user)
            auth_service = AuthService()
            success, returned_user, context = auth_service.login_user(
                user.username, 
                'testpassword'
            )
            
            assert success is True
            assert returned_user.id == user.id
            assert 'redirect_url' in context
            assert context.get('force_password_change') is None
    
    def test_login_user_invalid_credentials(self, app, test_user):
        """Test login with invalid credentials."""
        with app.app_context():
            user = User.query.get(test_user)
            auth_service = AuthService()
            success, returned_user, context = auth_service.login_user(
                user.username,
                'wrongpassword'
            )
            
            assert success is False
            assert returned_user is None
            assert 'Invalid credentials' in context['error_message']
    
    def test_login_user_nonexistent_user(self, app):
        """Test login with nonexistent user."""
        with app.app_context():
            auth_service = AuthService()
            success, user, context = auth_service.login_user(
                'nonexistent',
                'password'
            )
            
            assert success is False
            assert user is None
            assert 'Invalid credentials' in context['error_message']
    
    def test_login_user_missing_credentials(self, app):
        """Test login with missing credentials."""
        with app.app_context():
            auth_service = AuthService()
            
            # Test empty username
            success, user, context = auth_service.login_user('', 'password')
            assert success is False
            assert 'required' in context['error_message']
            
            # Test empty password
            success, user, context = auth_service.login_user('user', '')
            assert success is False
            assert 'required' in context['error_message']
    
    def test_login_user_force_password_change(self, app):
        """Test login with user who must change password."""
        with app.app_context():
            user = UserFactory.create(
                username='forcechange',
                force_password_change=True
            )
            db.session.commit()
            
            auth_service = AuthService()
            success, returned_user, context = auth_service.login_user(
                'forcechange',
                'testpassword'
            )
            
            assert success is True
            assert context.get('force_password_change') is True
            assert 'change_password' in context['redirect_url']
    
    def test_register_user_success(self, app):
        """Test successful user registration."""
        with app.app_context():
            auth_service = AuthService()
            success, user, message = auth_service.register_user(
                'newuser',
                'new@example.com',
                'newpassword'
            )
            
            assert success is True
            assert user.username == 'newuser'
            assert user.email == 'new@example.com'
            assert user.check_password('newpassword')
            assert 'registered successfully' in message
    
    def test_register_user_duplicate_username(self, app, test_user):
        """Test registration with duplicate username."""
        with app.app_context():
            user = User.query.get(test_user)
            auth_service = AuthService()
            success, returned_user, message = auth_service.register_user(
                user.username,  # Duplicate username
                'different@example.com',
                'password'
            )
            
            assert success is False
            assert returned_user is None
            assert 'already exists' in message
    
    def test_register_user_duplicate_email(self, app, test_user):
        """Test registration with duplicate email."""
        with app.app_context():
            user = User.query.get(test_user)
            auth_service = AuthService()
            success, returned_user, message = auth_service.register_user(
                'different_user',
                user.email,  # Duplicate email
                'password'
            )
            
            assert success is False
            assert returned_user is None
            assert 'already registered' in message
    
    def test_request_password_reset_success(self, app, test_user):
        """Test successful password reset request."""
        with app.app_context():
            user = User.query.get(test_user)
            auth_service = AuthService()
            success, message = auth_service.request_password_reset(user.email)
            
            assert success is True
            assert 'reset instructions sent' in message
            
            # Check that a token was created
            token = PasswordResetToken.query.filter_by(user_id=user.id).first()
            assert token is not None
            assert token.is_valid()
    
    def test_request_password_reset_nonexistent_email(self, app):
        """Test password reset request for nonexistent email."""
        with app.app_context():
            auth_service = AuthService()
            success, message = auth_service.request_password_reset('nonexistent@example.com')
            
            # Should still return success for security (don't reveal if email exists)
            assert success is True
            assert 'If this email is registered' in message
    
    def test_request_password_reset_empty_email(self, app):
        """Test password reset request with empty email."""
        with app.app_context():
            auth_service = AuthService()
            success, message = auth_service.request_password_reset('')
            
            assert success is False
            assert 'required' in message
    
    def test_reset_password_success(self, app, test_user):
        """Test successful password reset."""
        with app.app_context():
            user = User.query.get(test_user)
            # Create a valid reset token
            reset_token = PasswordResetTokenFactory.create(user=user)
            db.session.commit()
            
            auth_service = AuthService()
            success, message = auth_service.reset_password(
                reset_token.token,
                'newpassword123'
            )
            
            assert success is True
            assert 'reset successfully' in message
            
            # Check password was changed
            db.session.refresh(user)
            assert user.check_password('newpassword123')
            
            # Check token was marked as used
            db.session.refresh(reset_token)
            assert reset_token.used is True
    
    def test_reset_password_invalid_token(self, app):
        """Test password reset with invalid token."""
        with app.app_context():
            auth_service = AuthService()
            success, message = auth_service.reset_password(
                'invalid_token',
                'newpassword'
            )
            
            assert success is False
            assert 'Invalid or expired' in message
    
    def test_reset_password_expired_token(self, app, test_user):
        """Test password reset with expired token."""
        with app.app_context():
            user = User.query.get(test_user)
            # Create an expired token
            reset_token = PasswordResetTokenFactory.create_expired(user=user)
            db.session.commit()
            
            auth_service = AuthService()
            success, message = auth_service.reset_password(
                reset_token.token,
                'newpassword'
            )
            
            assert success is False
            assert 'Invalid or expired' in message
    
    def test_reset_password_used_token(self, app, test_user):
        """Test password reset with already used token."""
        with app.app_context():
            user = User.query.get(test_user)
            # Create a used token
            reset_token = PasswordResetTokenFactory.create_used(user=user)
            db.session.commit()
            
            auth_service = AuthService()
            success, message = auth_service.reset_password(
                reset_token.token,
                'newpassword'
            )
            
            assert success is False
            assert 'Invalid or expired' in message
    
    def test_change_password_success(self, app, test_user):
        """Test successful password change."""
        with app.app_context():
            user = User.query.get(test_user)
            auth_service = AuthService()
            success, message = auth_service.change_password(
                user,
                'testpassword',  # Current password
                'newpassword123'  # New password
            )
            
            assert success is True
            assert 'changed successfully' in message
            
            # Verify password was changed
            db.session.refresh(user)
            assert user.check_password('newpassword123')
            assert user.force_password_change is False
    
    def test_change_password_wrong_current_password(self, app, test_user):
        """Test password change with wrong current password."""
        with app.app_context():
            user = User.query.get(test_user)
            auth_service = AuthService()
            success, message = auth_service.change_password(
                user,
                'wrongpassword',
                'newpassword'
            )
            
            assert success is False
            assert 'Current password is incorrect' in message
    
    def test_change_password_missing_data(self, app, test_user):
        """Test password change with missing data."""
        with app.app_context():
            user = User.query.get(test_user)
            auth_service = AuthService()
            
            # Test missing current password
            success, message = auth_service.change_password(
                user, '', 'newpassword'
            )
            assert success is False
            assert 'required' in message
            
            # Test missing new password
            success, message = auth_service.change_password(
                user, 'testpassword', ''
            )
            assert success is False
            assert 'required' in message
