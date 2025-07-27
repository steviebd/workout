"""
Pytest configuration and fixtures for testing.
"""
import pytest
import tempfile
import os

from app import create_app
from app.core import db
from app.models import User

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
        user = User(username='testuser', email='test@example.com')
        user.set_password('testpassword')
        db.session.add(user)
        db.session.commit()
        return user

@pytest.fixture
def admin_user(app):
    """Create an admin test user."""
    with app.app_context():
        user = User(username='admin', email='admin@example.com', is_admin=True)
        user.set_password('adminpassword')
        db.session.add(user)
        db.session.commit()
        return user
