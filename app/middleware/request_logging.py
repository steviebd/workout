"""
Request/response logging middleware for better observability.
"""
import time
import uuid
from typing import Any
from flask import Flask, request, g, current_app

def setup_request_logging(app: Flask) -> None:
    """
    Set up request/response logging middleware.
    
    Args:
        app: Flask application instance
    """
    
    @app.before_request
    def before_request() -> None:
        """Log request start and set up request context."""
        g.request_id = str(uuid.uuid4())[:8]
        g.start_time = time.time()
        
        if current_app.debug:
            current_app.logger.info(
                f"Request started: {request.method} {request.path}",
                extra={'extra_fields': {
                    'request_id': g.request_id,
                    'method': request.method,
                    'path': request.path,
                    'remote_addr': request.remote_addr,
                    'user_agent': request.headers.get('User-Agent', '')[:100]
                }}
            )
    
    @app.after_request
    def after_request(response: Any) -> Any:
        """Log request completion."""
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            
            # Log slow requests as warnings
            level = 'warning' if duration > 1.0 else 'info'
            
            if current_app.debug or level == 'warning':
                log_method = getattr(current_app.logger, level)
                # Calculate response size safely
                response_size = 0
                try:
                    if hasattr(response, 'content_length') and response.content_length:
                        response_size = response.content_length
                    elif hasattr(response, 'get_data'):
                        # Only get data if we can do it safely
                        if not getattr(response, 'direct_passthrough', False):
                            response_size = len(response.get_data())
                except (RuntimeError, AttributeError):
                    response_size = 0
                
                log_method(
                    f"Request completed: {request.method} {request.path} - {response.status_code}",
                    extra={'extra_fields': {
                        'request_id': getattr(g, 'request_id', 'unknown'),
                        'status_code': response.status_code,
                        'duration_ms': round(duration * 1000, 2),
                        'response_size': response_size
                    }}
                )
        
        return response
    
    @app.errorhandler(500)
    def handle_500_error(error: Any) -> tuple:
        """Log and handle 500 errors."""
        current_app.logger.error(
            f"Internal server error: {str(error)}",
            extra={'extra_fields': {
                'request_id': getattr(g, 'request_id', 'unknown'),
                'path': request.path,
                'method': request.method,
            }},
            exc_info=True
        )
        return {'error': 'Internal server error'}, 500
    
    @app.errorhandler(404)
    def handle_404_error(error: Any) -> tuple:
        """Log and handle 404 errors."""
        current_app.logger.warning(
            f"Page not found: {request.path}",
            extra={'extra_fields': {
                'request_id': getattr(g, 'request_id', 'unknown'),
                'path': request.path,
                'method': request.method,
                'referrer': request.referrer
            }}
        )
        return {'error': 'Page not found'}, 404
