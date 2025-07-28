"""
Base service class with common functionality.
"""
from typing import Any, Dict
from flask import current_app
from app.core import db

class BaseService:
    """Base service class with common database and logging functionality."""
    
    def __init__(self):
        self.db = db
        self.logger = current_app.logger
    
    def commit_changes(self) -> bool:
        """
        Commit database changes with error handling.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.db.session.commit()
            return True
        except Exception as e:
            self.logger.error(f"Database commit failed: {str(e)}")
            self.db.session.rollback()
            return False
    
    def safe_add(self, instance: Any) -> bool:
        """
        Safely add an instance to the database session.
        
        Args:
            instance: Database model instance to add
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.db.session.add(instance)
            return True
        except Exception as e:
            self.logger.error(f"Failed to add instance {instance}: {str(e)}")
            return False
    
    def safe_delete(self, instance: Any) -> bool:
        """
        Safely delete an instance from the database.
        
        Args:
            instance: Database model instance to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.db.session.delete(instance)
            return True
        except Exception as e:
            self.logger.error(f"Failed to delete instance {instance}: {str(e)}")
            return False
    
    def log_info(self, message: str, **kwargs) -> None:
        """Log info message with optional context."""
        if kwargs:
            message = f"{message} - Context: {kwargs}"
        self.logger.info(message)
    
    def log_error(self, message: str, **kwargs) -> None:
        """Log error message with optional context."""
        if kwargs:
            message = f"{message} - Context: {kwargs}"
        self.logger.error(message)
