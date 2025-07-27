"""
Test data factories for creating model instances in tests.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from app.core import db
from app.models import User, Template, TemplateExercise, Workout, WorkoutExercise, PasswordResetToken

class UserFactory:
    """Factory for creating User instances in tests."""
    
    @staticmethod
    def create(
        username: str = "testuser",
        email: str = "test@example.com",
        password: str = "testpassword",
        is_admin: bool = False,
        force_password_change: bool = False,
        **kwargs
    ) -> User:
        """
        Create a User instance.
        
        Args:
            username: Username for the user
            email: Email address
            password: Plain text password (will be hashed)
            is_admin: Whether user is admin
            force_password_change: Whether to force password change
            **kwargs: Additional fields
            
        Returns:
            User: Created user instance
        """
        user = User(
            username=username,
            email=email,
            is_admin=is_admin,
            force_password_change=force_password_change,
            **kwargs
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()  # Get ID without committing
        return user
    
    @staticmethod
    def create_admin(username: str = "admin", **kwargs) -> User:
        """Create an admin user."""
        return UserFactory.create(
            username=username,
            email=f"{username}@example.com",
            is_admin=True,
            **kwargs
        )

class TemplateFactory:
    """Factory for creating Template instances in tests."""
    
    @staticmethod
    def create(
        user: User,
        name: str = "Test Template",
        exercises: Optional[list] = None,
        **kwargs
    ) -> Template:
        """
        Create a Template instance with exercises.
        
        Args:
            user: User who owns the template
            name: Template name
            exercises: List of exercise data dicts
            **kwargs: Additional fields
            
        Returns:
            Template: Created template instance
        """
        template = Template(
            user_id=user.id,
            name=name,
            **kwargs
        )
        db.session.add(template)
        db.session.flush()
        
        # Add default exercises if none provided
        if exercises is None:
            exercises = [
                {
                    'exercise_name': 'Squats',
                    'default_weight': 100.0,
                    'default_reps': 10,
                    'default_sets': 3
                },
                {
                    'exercise_name': 'Bench Press',
                    'default_weight': 80.0,
                    'default_reps': 8,
                    'default_sets': 3
                }
            ]
        
        # Create template exercises
        for i, exercise_data in enumerate(exercises):
            exercise = TemplateExercise(
                template_id=template.id,
                order_index=i,
                **exercise_data
            )
            db.session.add(exercise)
        
        db.session.flush()
        return template

class WorkoutFactory:
    """Factory for creating Workout instances in tests."""
    
    @staticmethod
    def create(
        user: User,
        template: Optional[Template] = None,
        performed_at: Optional[datetime] = None,
        notes: str = "",
        exercises: Optional[list] = None,
        **kwargs
    ) -> Workout:
        """
        Create a Workout instance with exercises.
        
        Args:
            user: User who performed the workout
            template: Template used (optional)
            performed_at: When workout was performed
            notes: Workout notes
            exercises: List of exercise data dicts
            **kwargs: Additional fields
            
        Returns:
            Workout: Created workout instance
        """
        if performed_at is None:
            performed_at = datetime.utcnow()
        
        workout = Workout(
            user_id=user.id,
            template_id=template.id if template else None,
            performed_at=performed_at,
            notes=notes,
            **kwargs
        )
        db.session.add(workout)
        db.session.flush()
        
        # Add exercises from template or provided list
        if exercises is None and template:
            # Copy from template
            for template_exercise in template.exercises:
                exercise = WorkoutExercise(
                    workout_id=workout.id,
                    exercise_name=template_exercise.exercise_name,
                    weight=template_exercise.default_weight,
                    reps=template_exercise.default_reps,
                    sets=template_exercise.default_sets,
                    order_index=template_exercise.order_index
                )
                db.session.add(exercise)
        elif exercises:
            # Use provided exercises
            for i, exercise_data in enumerate(exercises):
                exercise = WorkoutExercise(
                    workout_id=workout.id,
                    order_index=i,
                    **exercise_data
                )
                db.session.add(exercise)
        
        db.session.flush()
        return workout
    
    @staticmethod
    def create_completed_workout(
        user: User,
        days_ago: int = 1,
        **kwargs
    ) -> Workout:
        """Create a completed workout from a few days ago."""
        performed_at = datetime.utcnow() - timedelta(days=days_ago)
        return WorkoutFactory.create(
            user=user,
            performed_at=performed_at,
            **kwargs
        )

class PasswordResetTokenFactory:
    """Factory for creating PasswordResetToken instances in tests."""
    
    @staticmethod
    def create(
        user: User,
        token: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        used: bool = False,
        **kwargs
    ) -> PasswordResetToken:
        """
        Create a PasswordResetToken instance.
        
        Args:
            user: User the token belongs to
            token: Token string (auto-generated if None)
            expires_at: Token expiration time
            used: Whether token has been used
            **kwargs: Additional fields
            
        Returns:
            PasswordResetToken: Created token instance
        """
        if token is None:
            import secrets
            token = secrets.token_urlsafe(32)
        
        if expires_at is None:
            expires_at = datetime.utcnow() + timedelta(hours=1)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
            used=used,
            **kwargs
        )
        db.session.add(reset_token)
        db.session.flush()
        return reset_token
    
    @staticmethod
    def create_expired(user: User, **kwargs) -> PasswordResetToken:
        """Create an expired token."""
        expires_at = datetime.utcnow() - timedelta(hours=1)
        return PasswordResetTokenFactory.create(
            user=user,
            expires_at=expires_at,
            **kwargs
        )
    
    @staticmethod
    def create_used(user: User, **kwargs) -> PasswordResetToken:
        """Create a used token."""
        return PasswordResetTokenFactory.create(
            user=user,
            used=True,
            **kwargs
        )
