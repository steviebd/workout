"""
Flask application factory for the workout tracker.

This module creates and configures the Flask application with all necessary
extensions, blueprints, and configuration.
"""
from typing import Optional

from flask import Flask

from app.core import init_extensions, login_manager
from app.config import get_config
from app.config.security import SecurityConfig
from app.utils.logging import setup_logging
from app.middleware.request_logging import setup_request_logging

def create_app(config_name: str = None) -> Flask:
    """
    Create and configure the Flask application.
    
    Args:
        config_name: Name of the configuration to use (development, production, testing)
        
    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)
    config_class.init_app(app)
    
    # Initialize extensions
    init_extensions(app)
    
    # Set up logging
    setup_logging(app)
    
    # Set up request logging middleware
    setup_request_logging(app)
    
    # Configure security
    SecurityConfig.configure_talisman(app)
    
    # Import models after extensions are initialized
    from app.models import User
    
    # User loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id: str) -> Optional['User']:
        """Load user by ID for Flask-Login."""
        return User.query.get(int(user_id))
    
    # Register blueprints
    _register_blueprints(app)
    
    return app

def _register_blueprints(app: Flask) -> None:
    """
    Register all application blueprints.
    
    Args:
        app: Flask application instance
    """
    # Authentication blueprint
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    # Workout templates blueprint (renamed from templates)
    from app.workout_templates import bp as workout_templates_bp
    app.register_blueprint(workout_templates_bp, url_prefix='/templates')
    
    # Workouts blueprint
    from app.workouts import bp as workouts_bp
    app.register_blueprint(workouts_bp, url_prefix='/workouts')
    
    # Settings blueprint
    from app.settings import bp as settings_bp
    app.register_blueprint(settings_bp, url_prefix='/settings')
    
    # Main blueprint (no prefix for root routes)
    from app.main import bp as main_bp
    app.register_blueprint(main_bp)
