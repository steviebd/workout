"""
Input validation utilities for the workout application.
"""
import re
from typing import Dict, Any, List, Optional
from flask import jsonify


class ValidationError(Exception):
    """Custom exception for validation errors."""
    pass


class InputValidator:
    """Input validation class with security-focused validation rules."""
    
    # Regex patterns for validation
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{3,50}$')
    EXERCISE_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9\s\-_()]{1,100}$')
    TEMPLATE_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9\s\-_()]{1,100}$')
    
    @staticmethod
    def validate_string(value: Any, field_name: str, min_length: int = 1, max_length: int = 255, pattern: Optional[re.Pattern] = None) -> str:
        """Validate string input with length and pattern checks."""
        if not isinstance(value, str):
            raise ValidationError(f"{field_name} must be a string")
        
        value = value.strip()
        
        if len(value) < min_length:
            raise ValidationError(f"{field_name} must be at least {min_length} characters")
        
        if len(value) > max_length:
            raise ValidationError(f"{field_name} must be no more than {max_length} characters")
        
        if pattern and not pattern.match(value):
            raise ValidationError(f"{field_name} contains invalid characters")
        
        return value
    
    @staticmethod
    def validate_number(value: Any, field_name: str, min_value: float = 0, max_value: float = 999999) -> float:
        """Validate numeric input with range checks."""
        try:
            if isinstance(value, str):
                value = float(value)
            elif not isinstance(value, (int, float)):
                raise ValueError("Invalid type")
        except (ValueError, TypeError):
            raise ValidationError(f"{field_name} must be a valid number")
        
        if value < min_value:
            raise ValidationError(f"{field_name} must be at least {min_value}")
        
        if value > max_value:
            raise ValidationError(f"{field_name} must be no more than {max_value}")
        
        return float(value)
    
    @staticmethod
    def validate_integer(value: Any, field_name: str, min_value: int = 0, max_value: int = 999999) -> int:
        """Validate integer input with range checks."""
        try:
            if isinstance(value, str):
                value = int(value)
            elif not isinstance(value, int):
                raise ValueError("Invalid type")
        except (ValueError, TypeError):
            raise ValidationError(f"{field_name} must be a valid integer")
        
        if value < min_value:
            raise ValidationError(f"{field_name} must be at least {min_value}")
        
        if value > max_value:
            raise ValidationError(f"{field_name} must be no more than {max_value}")
        
        return int(value)
    
    @staticmethod
    def validate_boolean(value: Any, field_name: str) -> bool:
        """Validate boolean input."""
        if isinstance(value, bool):
            return value
        elif isinstance(value, str):
            return value.lower() in ('true', '1', 'yes', 'on')
        elif isinstance(value, int):
            return bool(value)
        else:
            raise ValidationError(f"{field_name} must be a boolean value")
    
    @staticmethod
    def validate_password(password: str) -> str:
        """Validate password strength."""
        if not isinstance(password, str):
            raise ValidationError("Password must be a string")
        
        if len(password) < 12:
            raise ValidationError("Password must be at least 12 characters long")
        
        if len(password) > 128:
            raise ValidationError("Password must be no more than 128 characters long")
        
        # Check for basic complexity
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
        
        if not (has_upper and has_lower and (has_digit or has_special)):
            raise ValidationError("Password must contain uppercase, lowercase, and either numbers or special characters")
        
        return password
    
    @staticmethod
    def validate_username(username: str) -> str:
        """Validate username format."""
        return InputValidator.validate_string(
            username, 
            "Username", 
            min_length=3, 
            max_length=50, 
            pattern=InputValidator.USERNAME_PATTERN
        )
    
    @staticmethod
    def validate_exercise_name(name: str) -> str:
        """Validate exercise name format."""
        return InputValidator.validate_string(
            name, 
            "Exercise name", 
            min_length=1, 
            max_length=100, 
            pattern=InputValidator.EXERCISE_NAME_PATTERN
        )
    
    @staticmethod
    def validate_template_name(name: str) -> str:
        """Validate template name format."""
        return InputValidator.validate_string(
            name, 
            "Template name", 
            min_length=1, 
            max_length=100, 
            pattern=InputValidator.TEMPLATE_NAME_PATTERN
        )


def validate_template_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate template creation/update data."""
    try:
        validated_data = {}
        
        # Validate template name
        if 'name' in data:
            validated_data['name'] = InputValidator.validate_template_name(data['name'])
        
        # Validate exercises
        if 'exercises' in data:
            if not isinstance(data['exercises'], list):
                raise ValidationError("Exercises must be a list")
            
            validated_exercises = []
            for i, exercise in enumerate(data['exercises']):
                if not isinstance(exercise, dict):
                    raise ValidationError(f"Exercise {i+1} must be an object")
                
                validated_exercise = {}
                
                # Validate exercise name
                if 'exercise_name' in exercise:
                    validated_exercise['exercise_name'] = InputValidator.validate_exercise_name(exercise['exercise_name'])
                
                # Validate numeric fields
                if 'default_weight' in exercise:
                    validated_exercise['default_weight'] = InputValidator.validate_number(exercise['default_weight'], f"Exercise {i+1} default weight", 0, 9999)
                
                if 'default_reps' in exercise:
                    validated_exercise['default_reps'] = InputValidator.validate_integer(exercise['default_reps'], f"Exercise {i+1} default reps", 0, 999)
                
                if 'default_sets' in exercise:
                    validated_exercise['default_sets'] = InputValidator.validate_integer(exercise['default_sets'], f"Exercise {i+1} default sets", 0, 99)
                
                validated_exercises.append(validated_exercise)
            
            validated_data['exercises'] = validated_exercises
        
        return validated_data
    
    except ValidationError as e:
        raise e
    except Exception as e:
        raise ValidationError(f"Invalid data format: {str(e)}")


def validate_workout_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate workout creation/update data."""
    try:
        validated_data = {}
        
        # Validate notes
        if 'notes' in data:
            validated_data['notes'] = InputValidator.validate_string(data['notes'], "Notes", 0, 1000)
        
        # Validate exercises
        if 'exercises' in data:
            if not isinstance(data['exercises'], list):
                raise ValidationError("Exercises must be a list")
            
            validated_exercises = []
            for i, exercise in enumerate(data['exercises']):
                if not isinstance(exercise, dict):
                    raise ValidationError(f"Exercise {i+1} must be an object")
                
                validated_exercise = {}
                
                # Validate exercise name
                if 'exercise_name' in exercise:
                    validated_exercise['exercise_name'] = InputValidator.validate_exercise_name(exercise['exercise_name'])
                
                # Validate numeric fields
                if 'weight' in exercise:
                    validated_exercise['weight'] = InputValidator.validate_number(exercise['weight'], f"Exercise {i+1} weight", 0, 9999)
                
                if 'reps' in exercise:
                    validated_exercise['reps'] = InputValidator.validate_integer(exercise['reps'], f"Exercise {i+1} reps", 0, 999)
                
                if 'sets' in exercise:
                    validated_exercise['sets'] = InputValidator.validate_integer(exercise['sets'], f"Exercise {i+1} sets", 0, 99)
                
                validated_exercises.append(validated_exercise)
            
            validated_data['exercises'] = validated_exercises
        
        return validated_data
    
    except ValidationError as e:
        raise e
    except Exception as e:
        raise ValidationError(f"Invalid data format: {str(e)}")


def validate_user_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate user creation/update data."""
    try:
        validated_data = {}
        
        # Validate username
        if 'username' in data:
            validated_data['username'] = InputValidator.validate_username(data['username'])
        
        # Validate password
        if 'password' in data:
            validated_data['password'] = InputValidator.validate_password(data['password'])
        
        # Validate current password (for password changes)
        if 'current_password' in data:
            if not isinstance(data['current_password'], str):
                raise ValidationError("Current password must be a string")
            validated_data['current_password'] = data['current_password']
        
        if 'new_password' in data:
            validated_data['new_password'] = InputValidator.validate_password(data['new_password'])
        
        # Validate admin flag
        if 'is_admin' in data:
            validated_data['is_admin'] = InputValidator.validate_boolean(data['is_admin'], "Admin flag")
        
        return validated_data
    
    except ValidationError as e:
        raise e
    except Exception as e:
        raise ValidationError(f"Invalid data format: {str(e)}")


def validation_error_response(error_message: str) -> tuple:
    """Create a standardized validation error response."""
    return jsonify({'error': error_message}), 400
