"""
Integration tests for authentication API endpoints.
"""
import pytest
import json

from app.models import User, PasswordResetToken
from app.core import db
from tests.factories import UserFactory, PasswordResetTokenFactory

class TestAuthAPI:
    """Integration tests for authentication endpoints."""
    
    def test_login_page_get(self, client):
        """Test GET login page returns HTML."""
        response = client.get('/auth/login')
        
        assert response.status_code == 200
        assert b'login' in response.data.lower()
    
    def test_login_success_html(self, client, test_user):
        """Test successful login via HTML form."""
        response = client.post('/auth/login', data={
            'username': test_user.username,
            'password': 'testpassword'
        }, follow_redirects=False)
        
        # Should redirect to dashboard
        assert response.status_code == 302
        assert '/dashboard' in response.location
    
    def test_login_success_json(self, client, test_user):
        """Test successful login via JSON API."""
        response = client.post('/auth/login', 
            json={
                'username': test_user.username,
                'password': 'testpassword'
            }
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'redirect' in data
    
    def test_login_invalid_credentials_html(self, client, test_user):
        """Test login with invalid credentials via HTML."""
        response = client.post('/auth/login', data={
            'username': test_user.username,
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 200
        assert b'Invalid credentials' in response.data
    
    def test_login_invalid_credentials_json(self, client, test_user):
        """Test login with invalid credentials via JSON."""
        response = client.post('/auth/login',
            json={
                'username': test_user.username,
                'password': 'wrongpassword'
            }
        )
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['success'] is False
        assert 'Invalid credentials' in data['message']
    
    def test_login_missing_data_json(self, client):
        """Test login with missing data via JSON."""
        response = client.post('/auth/login', json={})
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['success'] is False
        assert 'required' in data['message']
    
    def test_login_force_password_change(self, client, app):
        """Test login with user who must change password."""
        with app.app_context():
            user = UserFactory.create(
                username='forcechange',
                force_password_change=True
            )
            db.session.commit()
        
        response = client.post('/auth/login',
            json={
                'username': 'forcechange',
                'password': 'testpassword'
            }
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data.get('force_password_change') is True
        assert 'change_password' in data['redirect']
    
    def test_logout_html(self, authenticated_client):
        """Test logout via HTML form."""
        response = authenticated_client.post('/auth/logout')
        
        assert response.status_code == 302
        assert '/auth/login' in response.location
    
    def test_logout_json(self, authenticated_client):
        """Test logout via JSON API."""
        response = authenticated_client.post('/auth/logout',
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
    
    def test_forgot_password_page_get(self, client):
        """Test GET forgot password page."""
        response = client.get('/auth/forgot-password')
        
        assert response.status_code == 200
        assert b'forgot' in response.data.lower()
    
    def test_forgot_password_success(self, client, test_user):
        """Test successful password reset request."""
        response = client.post('/auth/forgot-password',
            json={'email': test_user.email}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'reset instructions sent' in data['message']
    
    def test_forgot_password_nonexistent_email(self, client):
        """Test password reset for nonexistent email."""
        response = client.post('/auth/forgot-password',
            json={'email': 'nonexistent@example.com'}
        )
        
        # Should still return success for security
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
    
    def test_forgot_password_missing_email(self, client):
        """Test password reset with missing email."""
        response = client.post('/auth/forgot-password', json={})
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'required' in data['message']
    
    def test_rate_limiting_login(self, client, test_user):
        """Test rate limiting on login endpoint."""
        # Make multiple failed login attempts
        for _ in range(11):  # Exceeds 10 per minute limit
            client.post('/auth/login',
                json={
                    'username': test_user.username,
                    'password': 'wrongpassword'
                }
            )
        
        # Next request should be rate limited
        response = client.post('/auth/login',
            json={
                'username': test_user.username,
                'password': 'wrongpassword'
            }
        )
        
        assert response.status_code == 429  # Too Many Requests
    
    def test_rate_limiting_forgot_password(self, client):
        """Test rate limiting on forgot password endpoint."""
        # Make multiple requests
        for _ in range(6):  # Exceeds 5 per minute limit
            client.post('/auth/forgot-password',
                json={'email': 'test@example.com'}
            )
        
        # Next request should be rate limited
        response = client.post('/auth/forgot-password',
            json={'email': 'test@example.com'}
        )
        
        assert response.status_code == 429  # Too Many Requests
    
    def test_authenticated_user_redirect(self, authenticated_client):
        """Test that authenticated users are redirected from login page."""
        response = authenticated_client.get('/auth/login')
        
        assert response.status_code == 302
        assert '/dashboard' in response.location

class TestPasswordReset:
    """Integration tests for password reset functionality."""
    
    def test_reset_password_valid_token(self, client, app, test_user):
        """Test password reset with valid token."""
        with app.app_context():
            reset_token = PasswordResetTokenFactory.create(user=test_user)
            db.session.commit()
        
        response = client.post(f'/auth/reset-password/{reset_token.token}',
            json={'new_password': 'newpassword123'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'reset successfully' in data['message']
        
        # Verify password was changed
        with app.app_context():
            user = User.query.get(test_user.id)
            assert user.check_password('newpassword123')
    
    def test_reset_password_invalid_token(self, client):
        """Test password reset with invalid token."""
        response = client.post('/auth/reset-password/invalid_token',
            json={'new_password': 'newpassword'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'Invalid or expired' in data['message']
    
    def test_reset_password_expired_token(self, client, app, test_user):
        """Test password reset with expired token."""
        with app.app_context():
            reset_token = PasswordResetTokenFactory.create_expired(user=test_user)
            db.session.commit()
        
        response = client.post(f'/auth/reset-password/{reset_token.token}',
            json={'new_password': 'newpassword'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'Invalid or expired' in data['message']
    
    def test_reset_password_used_token(self, client, app, test_user):
        """Test password reset with used token."""
        with app.app_context():
            reset_token = PasswordResetTokenFactory.create_used(user=test_user)
            db.session.commit()
        
        response = client.post(f'/auth/reset-password/{reset_token.token}',
            json={'new_password': 'newpassword'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'Invalid or expired' in data['message']
    
    def test_reset_password_missing_password(self, client, app, test_user):
        """Test password reset with missing new password."""
        with app.app_context():
            reset_token = PasswordResetTokenFactory.create(user=test_user)
            db.session.commit()
        
        response = client.post(f'/auth/reset-password/{reset_token.token}',
            json={}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'required' in data['message']
