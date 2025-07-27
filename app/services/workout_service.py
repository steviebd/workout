"""
Workout service for handling workout operations.
"""
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy import desc
from app.models import Workout, WorkoutExercise, Template, TemplateExercise, User
from .base_service import BaseService

class WorkoutService(BaseService):
    """Service for handling workout operations."""
    
    def start_workout(self, user: User, template_id: Optional[int] = None) -> Tuple[bool, Optional[Dict[str, Any]], str]:
        """
        Start a new workout session.
        
        Args:
            user: User instance
            template_id: Optional template ID to base workout on
            
        Returns:
            Tuple of (success, workout_dict, message)
        """
        try:
            # Create new workout
            workout = Workout(
                user_id=user.id,
                template_id=template_id,
                notes=''
            )
            
            if not self.safe_add(workout):
                return False, None, 'Failed to create workout'
            
            # Flush to get workout ID
            try:
                self.db.session.flush()
            except Exception as e:
                self.log_error(f"Failed to flush workout: {str(e)}")
                return False, None, 'Workout creation failed'
            
            # Copy exercises from template if provided
            if template_id:
                success, message = self._copy_template_exercises(workout, user)
                if not success:
                    return False, None, message
            
            if self.commit_changes():
                self.log_info(f"Workout started for user {user.id} with template {template_id}")
                return True, self._serialize_workout(workout), 'Workout started successfully'
            else:
                return False, None, 'Workout creation failed'
                
        except Exception as e:
            self.log_error(f"Workout start error for user {user.id}: {str(e)}")
            return False, None, 'Failed to start workout'
    
    def get_workout(self, workout_id: int, user: User) -> Optional[Dict[str, Any]]:
        """
        Get a specific workout by ID for a user.
        
        Args:
            workout_id: Workout ID
            user: User instance
            
        Returns:
            Workout dictionary or None if not found
        """
        try:
            workout = Workout.query.filter_by(id=workout_id, user_id=user.id).first()
            if workout:
                return self._serialize_workout(workout)
            return None
        except Exception as e:
            self.log_error(f"Error getting workout {workout_id} for user {user.id}: {str(e)}")
            return None
    
    def get_user_workouts(self, user: User, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get all workouts for a user.
        
        Args:
            user: User instance
            limit: Maximum number of workouts to return
            
        Returns:
            List of workout dictionaries
        """
        try:
            workouts = Workout.query.filter_by(user_id=user.id)\
                .order_by(desc(Workout.performed_at))\
                .limit(limit)\
                .all()
            return self._serialize_workouts(workouts)
        except Exception as e:
            self.log_error(f"Error getting workouts for user {user.id}: {str(e)}")
            return []
    
    def update_workout(self, workout_id: int, user: User, workout_data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]], str]:
        """
        Update an existing workout.
        
        Args:
            workout_id: Workout ID
            user: User instance
            workout_data: Updated workout data
            
        Returns:
            Tuple of (success, workout_dict, message)
        """
        try:
            workout = Workout.query.filter_by(id=workout_id, user_id=user.id).first()
            if not workout:
                return False, None, 'Workout not found'
            
            # Update notes if provided
            if 'notes' in workout_data:
                workout.notes = workout_data['notes']
            
            # Update exercises if provided
            if 'exercises' in workout_data:
                success, message = self._update_workout_exercises(workout, workout_data['exercises'])
                if not success:
                    return False, None, message
            
            if self.commit_changes():
                self.log_info(f"Workout {workout_id} updated for user {user.id}")
                return True, self._serialize_workout(workout), 'Workout updated successfully'
            else:
                return False, None, 'Workout update failed'
                
        except Exception as e:
            self.log_error(f"Workout update error for workout {workout_id}, user {user.id}: {str(e)}")
            return False, None, 'Workout update failed'
    
    def complete_workout(self, workout_id: int, user: User, workout_data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]], str]:
        """
        Complete a workout session.
        
        Args:
            workout_id: Workout ID
            user: User instance
            workout_data: Final workout data
            
        Returns:
            Tuple of (success, workout_dict, message)
        """
        try:
            workout = Workout.query.filter_by(id=workout_id, user_id=user.id).first()
            if not workout:
                return False, None, 'Workout not found'
            
            # Update workout with final data
            if 'notes' in workout_data:
                workout.notes = workout_data['notes']
            
            if 'exercises' in workout_data:
                success, message = self._update_workout_exercises(workout, workout_data['exercises'])
                if not success:
                    return False, None, message
            
            # Set completion time
            workout.performed_at = datetime.utcnow()
            
            if self.commit_changes():
                self.log_info(f"Workout {workout_id} completed for user {user.id}")
                return True, self._serialize_workout(workout), 'Workout completed successfully'
            else:
                return False, None, 'Workout completion failed'
                
        except Exception as e:
            self.log_error(f"Workout completion error for workout {workout_id}, user {user.id}: {str(e)}")
            return False, None, 'Workout completion failed'
    
    def delete_workout(self, workout_id: int, user: User) -> Tuple[bool, str]:
        """
        Delete a workout.
        
        Args:
            workout_id: Workout ID
            user: User instance
            
        Returns:
            Tuple of (success, message)
        """
        try:
            workout = Workout.query.filter_by(id=workout_id, user_id=user.id).first()
            if not workout:
                return False, 'Workout not found'
            
            if self.safe_delete(workout) and self.commit_changes():
                self.log_info(f"Workout {workout_id} deleted for user {user.id}")
                return True, 'Workout deleted successfully'
            else:
                return False, 'Workout deletion failed'
                
        except Exception as e:
            self.log_error(f"Workout deletion error for workout {workout_id}, user {user.id}: {str(e)}")
            return False, 'Workout deletion failed'
    
    def _copy_template_exercises(self, workout: Workout, user: User) -> Tuple[bool, str]:
        """Copy exercises from template to workout."""
        try:
            template = Template.query.filter_by(id=workout.template_id, user_id=user.id).first()
            if not template:
                return False, 'Template not found'
            
            for template_exercise in template.exercises:
                # Get last recorded values for this exercise
                last_workout_exercise = WorkoutExercise.query.join(Workout)\
                    .filter(Workout.user_id == user.id)\
                    .filter(WorkoutExercise.exercise_name == template_exercise.exercise_name)\
                    .order_by(desc(Workout.performed_at))\
                    .first()
                
                # Use last recorded values or template defaults
                weight = last_workout_exercise.weight if last_workout_exercise else template_exercise.default_weight
                reps = last_workout_exercise.reps if last_workout_exercise else template_exercise.default_reps
                sets = last_workout_exercise.sets if last_workout_exercise else template_exercise.default_sets
                
                workout_exercise = WorkoutExercise(
                    workout_id=workout.id,
                    exercise_name=template_exercise.exercise_name,
                    weight=weight,
                    reps=reps,
                    sets=sets,
                    order_index=template_exercise.order_index
                )
                
                if not self.safe_add(workout_exercise):
                    return False, 'Failed to copy template exercises'
            
            return True, 'Template exercises copied successfully'
            
        except Exception as e:
            self.log_error(f"Error copying template exercises: {str(e)}")
            return False, 'Failed to copy template exercises'
    
    def _update_workout_exercises(self, workout: Workout, exercises_data: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """Update workout exercises."""
        try:
            # Remove existing exercises
            for exercise in workout.exercises:
                if not self.safe_delete(exercise):
                    return False, 'Failed to update workout exercises'
            
            # Add new exercises
            for i, exercise_data in enumerate(exercises_data):
                exercise = WorkoutExercise(
                    workout_id=workout.id,
                    exercise_name=exercise_data.get('exercise_name', ''),
                    weight=exercise_data.get('weight', 0),
                    reps=exercise_data.get('reps', 0),
                    sets=exercise_data.get('sets', 0),
                    order_index=exercise_data.get('order_index', i)
                )
                
                if not self.safe_add(exercise):
                    return False, 'Failed to update workout exercises'
            
            return True, 'Exercises updated successfully'
            
        except Exception as e:
            self.log_error(f"Error updating workout exercises: {str(e)}")
            return False, 'Failed to update exercises'
    
    def _serialize_workout(self, workout: Workout) -> Dict[str, Any]:
        """Serialize a single workout to dictionary."""
        return {
            'id': workout.id,
            'template_id': workout.template_id,
            'performed_at': workout.performed_at.isoformat(),
            'notes': workout.notes,
            'exercises': [{
                'id': e.id,
                'exercise_name': e.exercise_name,
                'weight': e.weight,
                'reps': e.reps,
                'sets': e.sets,
                'order_index': e.order_index
            } for e in workout.exercises]
        }
    
    def _serialize_workouts(self, workouts: List[Workout]) -> List[Dict[str, Any]]:
        """Serialize a list of workouts to dictionaries."""
        return [self._serialize_workout(workout) for workout in workouts]
