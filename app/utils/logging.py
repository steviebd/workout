"""
Structured logging utilities for better troubleshooting.
"""
import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from flask import request, g, current_app

class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs structured JSON logs."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON."""
        log_data: Dict[str, Any] = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add request context if available
        if request:
            log_data['request'] = {
                'method': request.method,
                'path': request.path,
                'remote_addr': request.remote_addr,
                'user_agent': request.headers.get('User-Agent'),
            }
            
            # Add user ID if available
            if hasattr(g, 'user_id'):
                log_data['user_id'] = g.user_id
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add any extra fields
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)
        
        return json.dumps(log_data, default=str)

def setup_logging(app) -> None:
    """
    Set up structured logging for the application.
    
    Args:
        app: Flask application instance
    """
    # Create structured formatter
    formatter = StructuredFormatter()
    
    # Set up console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    
    # Set up file handler for production
    if not app.debug:
        import os
        from logging.handlers import RotatingFileHandler
        
        logs_dir = 'logs'
        if not os.path.exists(logs_dir):
            os.makedirs(logs_dir)
        
        file_handler = RotatingFileHandler(
            'logs/workout.log',
            maxBytes=10240000,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)
        
        app.logger.addHandler(file_handler)
    
    # Add console handler
    app.logger.addHandler(console_handler)
    app.logger.setLevel(logging.INFO)

def log_request_start() -> None:
    """Log the start of a request."""
    if current_app.debug:
        current_app.logger.info(
            "Request started",
            extra={'extra_fields': {
                'request_id': getattr(g, 'request_id', None),
                'endpoint': request.endpoint,
            }}
        )

def log_request_end(response) -> None:
    """Log the end of a request."""
    if current_app.debug:
        current_app.logger.info(
            "Request completed",
            extra={'extra_fields': {
                'request_id': getattr(g, 'request_id', None),
                'status_code': response.status_code,
                'response_size': len(response.get_data()),
            }}
        )

def log_service_operation(service_name: str, operation: str, **kwargs) -> None:
    """
    Log service layer operations for better troubleshooting.
    
    Args:
        service_name: Name of the service (e.g., 'AuthService')
        operation: Name of the operation (e.g., 'login_user')
        **kwargs: Additional context to log
    """
    current_app.logger.info(
        f"{service_name}.{operation}",
        extra={'extra_fields': {
            'service': service_name,
            'operation': operation,
            **kwargs
        }}
    )

def log_database_operation(operation: str, model: str, **kwargs) -> None:
    """
    Log database operations.
    
    Args:
        operation: Type of operation (create, update, delete, etc.)
        model: Model name being operated on
        **kwargs: Additional context
    """
    current_app.logger.info(
        f"Database {operation}: {model}",
        extra={'extra_fields': {
            'database_operation': operation,
            'model': model,
            **kwargs
        }}
    )
