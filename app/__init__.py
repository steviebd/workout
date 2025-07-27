import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    
    # Database configuration with SSL fallback
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///workout.db')
    
    # If SSL connection fails, fall back to non-SSL for development
    if 'postgresql' in database_url and '?sslmode=require' in database_url:
        try:
            # Test if SSL connection works
            import psycopg2
            from urllib.parse import urlparse
            
            parsed = urlparse(database_url)
            test_conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                database=parsed.path[1:],  # Remove leading slash
                user=parsed.username,
                password=parsed.password,
                sslmode='require'
            )
            test_conn.close()
            app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        except Exception as e:
            print(f"SSL connection failed, falling back to non-SSL: {e}")
            database_url_no_ssl = os.environ.get('DATABASE_URL_NO_SSL', database_url.replace('?sslmode=require', ''))
            app.config['SQLALCHEMY_DATABASE_URI'] = database_url_no_ssl
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Security configuration
    app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', 'True').lower() == 'true'
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = int(os.environ.get('PERMANENT_SESSION_LIFETIME', 3600))
    app.config['WTF_CSRF_TIME_LIMIT'] = 3600
    
    # Rate limiting configuration
    app.config['RATELIMIT_STORAGE_URL'] = os.environ.get('RATELIMIT_STORAGE_URL', 'memory://')
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    csrf.init_app(app)
    limiter.init_app(app)
    
    # Configure Talisman for security headers
    force_https = os.environ.get('FORCE_HTTPS', 'True').lower() == 'true'
    if force_https:
        Talisman(app, 
                force_https=True,
                strict_transport_security=True,
                strict_transport_security_max_age=31536000,
                content_security_policy={
                    'default-src': "'self'",
                    'script-src': "'self' 'unsafe-inline' https://cdn.jsdelivr.net",
                    'style-src': "'self' 'unsafe-inline' https://cdn.jsdelivr.net",
                    'font-src': "'self' https://cdn.jsdelivr.net",
                    'img-src': "'self' data:",
                    'connect-src': "'self'"
                })
    else:
        # Development mode - relaxed security headers
        Talisman(app, force_https=False)
    
    # Import models
    from app.models import User, Template, TemplateExercise, Workout, WorkoutExercise
    
    # User loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Register blueprints
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    from app.templates import bp as templates_bp
    app.register_blueprint(templates_bp, url_prefix='/templates')
    
    from app.workouts import bp as workouts_bp
    app.register_blueprint(workouts_bp, url_prefix='/workouts')
    
    from app.settings import bp as settings_bp
    app.register_blueprint(settings_bp, url_prefix='/settings')
    
    from app.main import bp as main_bp
    app.register_blueprint(main_bp)
    
    return app
