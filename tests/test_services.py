"""
Tests for service layer functionality.
"""
import pytest
from app.services import AuthService, WorkoutTemplateService, WorkoutService, ResponseService
from app.models import User

class TestAuthService:
    """Test the authentication service."""
    
    def test_login_user_invalid_credentials(self, app):
        """Test login with invalid credentials."""
        with app.app_context():
            auth_service = AuthService()
            success, user, context = auth_service.login_user("nonexistent", "wrongpass")
            
            assert success is False
            assert user is None
            assert "Invalid credentials" in context.get('error_message', '')
    
    def test_login_user_missing_data(self, app):
        """Test login with missing data."""
        with app.app_context():
            auth_service = AuthService()
            success, user, context = auth_service.login_user("", "")
            
            assert success is False
            assert user is None
            assert "required" in context.get('error_message', '')

class TestWorkoutTemplateService:
    """Test the workout template service."""
    
    def test_get_user_templates_empty(self, app, test_user):
        """Test getting templates for user with no templates."""
        with app.app_context():
            user = User.query.get(test_user)
            template_service = WorkoutTemplateService()
            templates = template_service.get_user_templates(user)
            
            assert isinstance(templates, list)
            assert len(templates) == 0

class TestWorkoutService:
    """Test the workout service."""
    
    def test_get_user_workouts_empty(self, app, test_user):
        """Test getting workouts for user with no workouts."""
        with app.app_context():
            user = User.query.get(test_user)
            workout_service = WorkoutService()
            workouts = workout_service.get_user_workouts(user)
            
            assert isinstance(workouts, list)
            assert len(workouts) == 0

class TestResponseService:
    """Test the response service."""
    
    def test_success_response(self, app):
        """Test creating a success response."""
        with app.test_request_context('/test', json=True):
            response, status_code = ResponseService.success_response(
                data={'test': 'data'}, 
                message='Test success'
            )
            
            assert status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert data['message'] == 'Test success'
            assert data['data']['test'] == 'data'
    
    def test_error_response(self, app):
        """Test creating an error response."""
        with app.test_request_context('/test', json=True):
            response, status_code = ResponseService.error_response(
                message='Test error',
                status_code=400
            )
            
            assert status_code == 400
            data = response.get_json()
            assert data['success'] is False
            assert data['message'] == 'Test error'
