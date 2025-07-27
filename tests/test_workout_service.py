"""
Unit tests for WorkoutService.
"""
import pytest
from datetime import datetime, timedelta

from app.services.workout_service import WorkoutService
from app.models import User, Template, Workout
from app.core import db
from tests.factories import UserFactory, TemplateFactory, WorkoutFactory

class TestWorkoutService:
    """Test cases for WorkoutService."""
    
    def test_get_user_workouts_empty(self, app, test_user):
        """Test getting workouts for user with no workouts."""
        with app.app_context():
            user = User.query.get(test_user)
            service = WorkoutService()
            workouts = service.get_user_workouts(user)
            
            assert isinstance(workouts, list)
            assert len(workouts) == 0
    
    def test_get_user_workouts_with_data(self, app, test_user):
        """Test getting workouts for user with workouts."""
        with app.app_context():
            user = User.query.get(test_user)
            template = TemplateFactory.create(user=user, name="Test Template")
            workout1 = WorkoutFactory.create(user=user, template=template, performed_at=datetime.now())
            workout2 = WorkoutFactory.create(user=user, template=template, performed_at=datetime.now() - timedelta(days=1))
            db.session.commit()
            
            service = WorkoutService()
            workouts = service.get_user_workouts(user)
            
            assert len(workouts) == 2
            # Should be ordered by performed_at descending (newest first)
            assert workouts[0]['performed_at'] > workouts[1]['performed_at']
    
    def test_get_user_workouts_isolation(self, app, multiple_users):
        """Test that users only see their own workouts."""
        with app.app_context():
            user1, user2, user3 = [User.query.get(uid) for uid in multiple_users]
            
            # Create workouts for different users
            template1 = TemplateFactory.create(user=user1)
            template2 = TemplateFactory.create(user=user2)
            WorkoutFactory.create(user=user1, template=template1)
            WorkoutFactory.create(user=user2, template=template2)
            WorkoutFactory.create(user=user2, template=template2)
            db.session.commit()
            
            service = WorkoutService()
            
            user1_workouts = service.get_user_workouts(user1)
            user2_workouts = service.get_user_workouts(user2)
            user3_workouts = service.get_user_workouts(user3)
            
            assert len(user1_workouts) == 1
            assert len(user2_workouts) == 2
            assert len(user3_workouts) == 0
    
    def test_get_workout_success(self, app, test_user):
        """Test getting a specific workout by ID."""
        with app.app_context():
            user = User.query.get(test_user)
            template = TemplateFactory.create(user=user)
            workout = WorkoutFactory.create(user=user, template=template)
            db.session.commit()
            
            service = WorkoutService()
            workout_data = service.get_workout(workout.id, user)
            
            assert workout_data is not None
            assert workout_data['id'] == workout.id
            assert workout_data['template_id'] == template.id
            assert 'exercises' in workout_data
    
    def test_get_workout_not_found(self, app, test_user):
        """Test getting non-existent workout."""
        with app.app_context():
            user = User.query.get(test_user)
            service = WorkoutService()
            workout_data = service.get_workout(99999, user)
            
            assert workout_data is None
    
    def test_get_workout_wrong_user(self, app, multiple_users):
        """Test getting workout that belongs to another user."""
        with app.app_context():
            user1, user2, _ = [User.query.get(uid) for uid in multiple_users]
            
            # Create workout for user1
            template = TemplateFactory.create(user=user1)
            workout = WorkoutFactory.create(user=user1, template=template)
            db.session.commit()
            
            service = WorkoutService()
            # Try to get user1's workout as user2
            workout_data = service.get_workout(workout.id, user2)
            
            assert workout_data is None
    
    def test_start_workout_success(self, app, test_user):
        """Test successful workout creation."""
        with app.app_context():
            user = User.query.get(test_user)
            template = TemplateFactory.create(user=user)
            db.session.commit()
            
            service = WorkoutService()
            success, result, message = service.start_workout(user, template.id)
            
            assert success is True
            assert result is not None
            assert result['id'] is not None
            assert 'started successfully' in message
            
            # Verify in database
            workout = Workout.query.get(result['id'])
            assert workout is not None
            assert workout.user_id == user.id
            assert workout.template_id == template.id
    
    def test_start_workout_invalid_template(self, app, test_user):
        """Test workout creation with invalid template ID."""
        with app.app_context():
            user = User.query.get(test_user)
            
            service = WorkoutService()
            success, result, message = service.start_workout(user, 99999)  # Non-existent template
            
            assert success is False
            assert result is None
            assert 'not found' in message
    
    def test_start_workout_template_wrong_user(self, app, multiple_users):
        """Test workout creation with template from another user."""
        with app.app_context():
            user1, user2, _ = [User.query.get(uid) for uid in multiple_users]
            
            # Create template for user1
            template = TemplateFactory.create(user=user1)
            db.session.commit()
            
            service = WorkoutService()
            # Try to use user1's template as user2
            success, result, message = service.start_workout(user2, template.id)
            
            assert success is False
            assert result is None
            assert 'not found' in message
    
    def test_start_workout_no_template(self, app, test_user):
        """Test workout creation without template ID."""
        with app.app_context():
            user = User.query.get(test_user)
            
            service = WorkoutService()
            success, result, message = service.start_workout(user, None)
            
            assert success is True
            assert result is not None
            assert 'started successfully' in message
    
    def test_update_workout_success(self, app, test_user):
        """Test successful workout update."""
        with app.app_context():
            user = User.query.get(test_user)
            template = TemplateFactory.create(user=user)
            workout = WorkoutFactory.create(user=user, template=template)
            db.session.commit()
            
            update_data = {
                'notes': 'Updated workout notes',
                'exercises': [
                    {
                        'exercise_name': 'Pull-ups',
                        'weight': 0,
                        'reps': 5,
                        'sets': 1
                    }
                ]
            }
            
            service = WorkoutService()
            success, result, message = service.update_workout(workout.id, user, update_data)
            
            assert success is True
            assert result is not None
            assert 'updated successfully' in message
            
            # Verify in database
            db.session.refresh(workout)
            assert workout.notes == 'Updated workout notes'
    
    def test_update_workout_not_found(self, app, test_user):
        """Test updating non-existent workout."""
        with app.app_context():
            user = User.query.get(test_user)
            update_data = {'notes': 'Updated notes'}
            
            service = WorkoutService()
            success, result, message = service.update_workout(99999, user, update_data)
            
            assert success is False
            assert result is None
            assert 'not found' in message
    
    def test_update_workout_wrong_user(self, app, multiple_users):
        """Test updating workout that belongs to another user."""
        with app.app_context():
            user1, user2, _ = [User.query.get(uid) for uid in multiple_users]
            
            # Create workout for user1
            template = TemplateFactory.create(user=user1)
            workout = WorkoutFactory.create(user=user1, template=template)
            db.session.commit()
            
            update_data = {'notes': 'Malicious update'}
            
            service = WorkoutService()
            # Try to update user1's workout as user2
            success, result, message = service.update_workout(workout.id, user2, update_data)
            
            assert success is False
            assert result is None
            assert 'not found' in message
    
    def test_delete_workout_success(self, app, test_user):
        """Test successful workout deletion."""
        with app.app_context():
            user = User.query.get(test_user)
            template = TemplateFactory.create(user=user)
            workout = WorkoutFactory.create(user=user, template=template)
            db.session.commit()
            workout_id = workout.id
            
            service = WorkoutService()
            success, message = service.delete_workout(workout_id, user)
            
            assert success is True
            assert 'deleted successfully' in message
            
            # Verify deletion
            deleted_workout = Workout.query.get(workout_id)
            assert deleted_workout is None
    
    def test_delete_workout_not_found(self, app, test_user):
        """Test deleting non-existent workout."""
        with app.app_context():
            user = User.query.get(test_user)
            service = WorkoutService()
            success, message = service.delete_workout(99999, user)
            
            assert success is False
            assert 'not found' in message
    
    def test_delete_workout_wrong_user(self, app, multiple_users):
        """Test deleting workout that belongs to another user."""
        with app.app_context():
            user1, user2, _ = [User.query.get(uid) for uid in multiple_users]
            
            # Create workout for user1
            template = TemplateFactory.create(user=user1)
            workout = WorkoutFactory.create(user=user1, template=template)
            db.session.commit()
            
            service = WorkoutService()
            # Try to delete user1's workout as user2
            success, message = service.delete_workout(workout.id, user2)
            
            assert success is False
            assert 'not found' in message
            
            # Verify workout still exists
            existing_workout = Workout.query.get(workout.id)
            assert existing_workout is not None
    
    def test_workout_serialization(self, app, test_user):
        """Test that workout serialization includes all required fields."""
        with app.app_context():
            user = User.query.get(test_user)
            template = TemplateFactory.create(user=user, name="Serialization Test")
            workout = WorkoutFactory.create(
                user=user, 
                template=template,
                notes="Test notes",
                performed_at=datetime(2024, 1, 15, 10, 30)
            )
            db.session.commit()
            
            service = WorkoutService()
            workouts = service.get_user_workouts(user)
            
            assert len(workouts) == 1
            workout_data = workouts[0]
            
            # Check required fields
            assert 'id' in workout_data
            assert 'template_id' in workout_data
            assert 'performed_at' in workout_data
            assert 'notes' in workout_data
            assert 'exercises' in workout_data
            
            # Check values
            assert workout_data['id'] == workout.id
            assert workout_data['template_id'] == template.id
            assert workout_data['notes'] == "Test notes"
            assert isinstance(workout_data['exercises'], list)
