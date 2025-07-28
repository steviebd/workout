"""
Response handling service for consistent API responses.
"""
from typing import Any, Dict, Optional, Union, Tuple
from flask import jsonify, render_template, request, Response
from werkzeug.exceptions import BadRequest, Unauthorized, Forbidden, NotFound

class ResponseService:
    """Service for handling consistent API and HTML responses."""
    
    @staticmethod
    def success_response(
        data: Any = None, 
        message: str = "Success", 
        status_code: int = 200,
        template: Optional[str] = None,
        **template_kwargs
    ) -> Union[Response, str]:
        """
        Create a success response (JSON or HTML).
        
        Args:
            data: Response data
            message: Success message
            status_code: HTTP status code
            template: Template name for HTML response
            **template_kwargs: Additional template variables
            
        Returns:
            JSON response or rendered template
        """
        if request.is_json or not template:
            response_data = {'success': True, 'message': message}
            if data is not None:
                response_data['data'] = data
            return jsonify(response_data), status_code
        
        # HTML response
        template_kwargs['success_message'] = message
        if data is not None:
            template_kwargs['data'] = data
        return render_template(template, **template_kwargs)
    
    @staticmethod
    def error_response(
        message: str = "An error occurred",
        status_code: int = 400,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        template: Optional[str] = None,
        **template_kwargs
    ) -> Union[Response, str]:
        """
        Create an error response (JSON or HTML).
        
        Args:
            message: Error message
            status_code: HTTP status code
            error_code: Application-specific error code
            details: Additional error details
            template: Template name for HTML response
            **template_kwargs: Additional template variables
            
        Returns:
            JSON response or rendered template
        """
        if request.is_json or not template:
            response_data = {
                'success': False,
                'message': message,
                'error_code': error_code
            }
            if details:
                response_data['details'] = details
            return jsonify(response_data), status_code
        
        # HTML response
        template_kwargs['error_message'] = message
        if details:
            template_kwargs['error_details'] = details
        return render_template(template, **template_kwargs)
    
    @staticmethod
    def validation_error_response(
        errors: Dict[str, str],
        message: str = "Validation failed",
        template: Optional[str] = None,
        **template_kwargs
    ) -> Union[Response, str]:
        """
        Create a validation error response.
        
        Args:
            errors: Dictionary of field errors
            message: Error message
            template: Template name for HTML response
            **template_kwargs: Additional template variables
            
        Returns:
            JSON response or rendered template
        """
        return ResponseService.error_response(
            message=message,
            status_code=400,
            error_code="VALIDATION_ERROR",
            details={'field_errors': errors},
            template=template,
            **template_kwargs
        )
    
    @staticmethod
    def unauthorized_response(
        message: str = "Authentication required",
        template: Optional[str] = None,
        **template_kwargs
    ) -> Union[Response, str]:
        """Create an unauthorized response."""
        return ResponseService.error_response(
            message=message,
            status_code=401,
            error_code="UNAUTHORIZED",
            template=template,
            **template_kwargs
        )
    
    @staticmethod
    def forbidden_response(
        message: str = "Access denied",
        template: Optional[str] = None,
        **template_kwargs
    ) -> Union[Response, str]:
        """Create a forbidden response."""
        return ResponseService.error_response(
            message=message,
            status_code=403,
            error_code="FORBIDDEN",
            template=template,
            **template_kwargs
        )
    
    @staticmethod
    def not_found_response(
        message: str = "Resource not found",
        template: Optional[str] = None,
        **template_kwargs
    ) -> Union[Response, str]:
        """Create a not found response."""
        return ResponseService.error_response(
            message=message,
            status_code=404,
            error_code="NOT_FOUND",
            template=template,
            **template_kwargs
        )
    
    @staticmethod
    def server_error_response(
        message: str = "Internal server error",
        template: Optional[str] = None,
        **template_kwargs
    ) -> Union[Response, str]:
        """Create a server error response."""
        return ResponseService.error_response(
            message=message,
            status_code=500,
            error_code="SERVER_ERROR",
            template=template,
            **template_kwargs
        )
