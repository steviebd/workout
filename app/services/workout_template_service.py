"""
Workout template service for handling template operations.
"""
from typing import List, Optional, Tuple, Dict, Any
from app.models import Template, TemplateExercise, User
from app.validators import validate_template_data, ValidationError
from .base_service import BaseService

class WorkoutTemplateService(BaseService):
    """Service for handling workout template operations."""
    
    def get_user_templates(self, user: User) -> List[Dict[str, Any]]:
        """
        Get all templates for a user.
        
        Args:
            user: User instance
            
        Returns:
            List of template dictionaries
        """
        try:
            templates = Template.query.filter_by(user_id=user.id).order_by(Template.created_at.desc()).all()
            return self._serialize_templates(templates)
        except Exception as e:
            self.log_error(f"Error getting templates for user {user.id}: {str(e)}")
            return []
    
    def get_template(self, template_id: int, user: User) -> Optional[Dict[str, Any]]:
        """
        Get a specific template by ID for a user.
        
        Args:
            template_id: Template ID
            user: User instance
            
        Returns:
            Template dictionary or None if not found
        """
        try:
            template = Template.query.filter_by(id=template_id, user_id=user.id).first()
            if template:
                return self._serialize_template(template)
            return None
        except Exception as e:
            self.log_error(f"Error getting template {template_id} for user {user.id}: {str(e)}")
            return None
    
    def create_template(self, user: User, template_data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]], str]:
        """
        Create a new workout template.
        
        Args:
            user: User instance
            template_data: Template data including name and exercises
            
        Returns:
            Tuple of (success, template_dict, message)
        """
        try:
            # Validate input data
            validated_data = validate_template_data(template_data)
            
            if 'name' not in validated_data:
                return False, None, 'Template name is required'
            
            # Create template
            template = Template(
                user_id=user.id,
                name=validated_data['name']
            )
            
            if not self.safe_add(template):
                return False, None, 'Failed to create template'
            
            # Flush to get template ID
            try:
                self.db.session.flush()
            except Exception as e:
                self.log_error(f"Failed to flush template: {str(e)}")
                return False, None, 'Template creation failed'
            
            # Add exercises
            exercises = validated_data.get('exercises', [])
            for i, exercise_data in enumerate(exercises):
                exercise = TemplateExercise(
                    template_id=template.id,
                    exercise_name=exercise_data.get('exercise_name', ''),
                    default_weight=exercise_data.get('default_weight', 0),
                    default_reps=exercise_data.get('default_reps', 0),
                    default_sets=exercise_data.get('default_sets', 0),
                    order_index=i
                )
                if not self.safe_add(exercise):
                    return False, None, 'Failed to add template exercises'
            
            if self.commit_changes():
                self.log_info(f"Template '{validated_data['name']}' created for user {user.id}")
                return True, self._serialize_template(template), 'Template created successfully'
            else:
                return False, None, 'Template creation failed'
                
        except ValidationError as e:
            return False, None, str(e)
        except Exception as e:
            self.log_error(f"Template creation error for user {user.id}: {str(e)}")
            return False, None, 'Template creation failed'
    
    def update_template(self, template_id: int, user: User, template_data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]], str]:
        """
        Update an existing workout template.
        
        Args:
            template_id: Template ID
            user: User instance
            template_data: Updated template data
            
        Returns:
            Tuple of (success, template_dict, message)
        """
        try:
            # Find template
            template = Template.query.filter_by(id=template_id, user_id=user.id).first()
            if not template:
                return False, None, 'Template not found'
            
            # Validate input data
            validated_data = validate_template_data(template_data)
            
            # Update template name if provided
            if 'name' in validated_data:
                template.name = validated_data['name']
            
            # Update exercises if provided
            if 'exercises' in validated_data:
                # Remove existing exercises
                for exercise in template.exercises:
                    if not self.safe_delete(exercise):
                        return False, None, 'Failed to update template exercises'
                
                # Add new exercises
                exercises = validated_data['exercises']
                for i, exercise_data in enumerate(exercises):
                    exercise = TemplateExercise(
                        template_id=template.id,
                        exercise_name=exercise_data.get('exercise_name', ''),
                        default_weight=exercise_data.get('default_weight', 0),
                        default_reps=exercise_data.get('default_reps', 0),
                        default_sets=exercise_data.get('default_sets', 0),
                        order_index=i
                    )
                    if not self.safe_add(exercise):
                        return False, None, 'Failed to update template exercises'
            
            if self.commit_changes():
                self.log_info(f"Template {template_id} updated for user {user.id}")
                return True, self._serialize_template(template), 'Template updated successfully'
            else:
                return False, None, 'Template update failed'
                
        except ValidationError as e:
            return False, None, str(e)
        except Exception as e:
            self.log_error(f"Template update error for template {template_id}, user {user.id}: {str(e)}")
            return False, None, 'Template update failed'
    
    def delete_template(self, template_id: int, user: User) -> Tuple[bool, str]:
        """
        Delete a workout template.
        
        Args:
            template_id: Template ID
            user: User instance
            
        Returns:
            Tuple of (success, message)
        """
        try:
            template = Template.query.filter_by(id=template_id, user_id=user.id).first()
            if not template:
                return False, 'Template not found'
            
            template_name = template.name
            if self.safe_delete(template) and self.commit_changes():
                self.log_info(f"Template '{template_name}' deleted for user {user.id}")
                return True, 'Template deleted successfully'
            else:
                return False, 'Template deletion failed'
                
        except Exception as e:
            self.log_error(f"Template deletion error for template {template_id}, user {user.id}: {str(e)}")
            return False, 'Template deletion failed'
    
    def _serialize_template(self, template: Template) -> Dict[str, Any]:
        """Serialize a single template to dictionary."""
        return {
            'id': template.id,
            'name': template.name,
            'created_at': template.created_at.isoformat(),
            'exercises': [{
                'id': e.id,
                'exercise_name': e.exercise_name,
                'default_weight': e.default_weight,
                'default_reps': e.default_reps,
                'default_sets': e.default_sets,
                'order_index': e.order_index
            } for e in template.exercises]
        }
    
    def _serialize_templates(self, templates: List[Template]) -> List[Dict[str, Any]]:
        """Serialize a list of templates to dictionaries."""
        return [self._serialize_template(template) for template in templates]
