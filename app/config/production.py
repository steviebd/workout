"""
Production environment configuration.
"""
from .base import BaseConfig
from .database import DatabaseConfig

class ProductionConfig(BaseConfig):
    """Production environment configuration."""
    
    DEBUG = False
    TESTING = False
    
    # Use production database
    SQLALCHEMY_DATABASE_URI = DatabaseConfig.get_database_uri()
    
    # Strict security for production
    SESSION_COOKIE_SECURE = True
    FORCE_HTTPS = True
    
    @staticmethod
    def init_app(app):
        """Initialize production-specific configuration."""
        import logging
        from logging.handlers import RotatingFileHandler
        
        # Set up file logging
        if not app.debug:
            file_handler = RotatingFileHandler('logs/workout.log', maxBytes=10240, backupCount=10)
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)
            app.logger.info('Workout tracker startup')
        
        BaseConfig.init_app(app)
