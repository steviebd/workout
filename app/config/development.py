"""
Development environment configuration.
"""
from .base import BaseConfig
from .database import DatabaseConfig

class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""
    
    DEBUG = True
    TESTING = False
    
    # Use development database
    SQLALCHEMY_DATABASE_URI = DatabaseConfig.get_database_uri()
    
    # Relaxed security for development
    SESSION_COOKIE_SECURE = False
    FORCE_HTTPS = False
    
    @staticmethod
    def init_app(app):
        """Initialize development-specific configuration."""
        print("Running in DEVELOPMENT mode")
        BaseConfig.init_app(app)
