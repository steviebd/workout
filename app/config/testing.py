"""
Testing environment configuration.
"""
from .base import BaseConfig
from .database import DatabaseConfig

class TestingConfig(BaseConfig):
    """Testing environment configuration."""
    
    DEBUG = True
    TESTING = True
    
    # Use test database
    SQLALCHEMY_DATABASE_URI = DatabaseConfig.get_test_database_uri()
    
    # Disable CSRF for testing
    WTF_CSRF_ENABLED = False
    
    # Disable security features for testing
    SESSION_COOKIE_SECURE = False
    FORCE_HTTPS = False
    
    @staticmethod
    def init_app(app):
        """Initialize testing-specific configuration."""
        BaseConfig.init_app(app)
