"""
Pytest configuration and fixtures for testing.
"""
import pytest
import tempfile
import os
from datetime import datetime, timedelta

from app import create_app
from app.core import db
from app.models import User, Template, Workout
from tests.factories import UserFactory, TemplateFactory, WorkoutFactory

@pytest.fixture
def app():
    """Create application for testing."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()
    
    app = create_app('testing')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()
    
    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def auth_headers(app):
    """Create headers with CSRF token for authenticated requests."""
    with app.test_client() as client:
        with client.session_transaction() as sess:
            sess['_csrf_token'] = 'test-token'
        return {'X-CSRFToken': 'test-token'}

@pytest.fixture
def test_user(app):
    """Create a test user."""
    with app.app_context():
        user = UserFactory.create()
        db.session.commit()
        # Return the user ID instead of the user object to avoid session issues
        user_id = user.id
        return user_id

@pytest.fixture  
def admin_user(app):
    """Create an admin test user."""
    with app.app_context():
        user = UserFactory.create_admin()
        db.session.commit()
        user_id = user.id
        return user_id

@pytest.fixture
def test_template(app, test_user):
    """Create a test template with exercises."""
    with app.app_context():
        user = User.query.get(test_user)
        template = TemplateFactory.create(user=user)
        db.session.commit()
        template_id = template.id
        return template_id

@pytest.fixture
def test_workout(app, test_user, test_template):
    """Create a test workout."""
    with app.app_context():
        user = User.query.get(test_user)
        template = Template.query.get(test_template)
        workout = WorkoutFactory.create(user=user, template=template)
        db.session.commit()
        workout_id = workout.id
        return workout_id

@pytest.fixture
def multiple_users(app):
    """Create multiple test users."""
    with app.app_context():
        users = [
            UserFactory.create(username=f'user{i}', email=f'user{i}@example.com')
            for i in range(3)
        ]
        db.session.commit()
        user_ids = [user.id for user in users]
        return user_ids

@pytest.fixture
def authenticated_client(app, test_user):
    """Create a test client with authenticated user."""
    with app.test_client() as client:
        with app.app_context():
            # Simulate login using user ID
            with client.session_transaction() as sess:
                sess['_user_id'] = str(test_user)
                sess['_fresh'] = True
        yield client
