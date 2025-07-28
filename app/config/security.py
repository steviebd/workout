"""
Security configuration utilities.
"""
import os
from flask_talisman import Talisman

class SecurityConfig:
    """Security configuration and utilities."""
    
    @staticmethod
    def configure_talisman(app):
        """
        Configure Talisman security headers for the app.
        
        Args:
            app: Flask application instance
        """
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
    
    @staticmethod
    def get_rate_limit_config():
        """
        Get rate limiting configuration.
        
        Returns:
            dict: Rate limiting configuration
        """
        return {
            'storage_url': os.environ.get('RATELIMIT_STORAGE_URL', 'memory://'),
            'default_limits': ["100 per hour"]
        }
