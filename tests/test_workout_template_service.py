"""
Unit tests for WorkoutTemplateService.
"""
import pytest

from app.services.workout_template_service import WorkoutTemplateService
from app.models import Template, TemplateExercise, User
from app.core import db
from tests.factories import UserFactory, TemplateFactory

class TestWorkoutTemplateService:
    """Test cases for WorkoutTemplateService."""
    
    def test_get_user_templates_empty(self, app, test_user):
        """Test getting templates for user with no templates."""
        with app.app_context():
            user = User.query.get(test_user)
            service = WorkoutTemplateService()
            templates = service.get_user_templates(user)
            
            assert isinstance(templates, list)
            assert len(templates) == 0
    
    def test_get_user_templates_with_data(self, app, test_user):
        """Test getting templates for user with templates."""
        with app.app_context():
            user = User.query.get(test_user)
            # Create templates
            template1 = TemplateFactory.create(user=user, name="Template 1")
            template2 = TemplateFactory.create(user=user, name="Template 2")
            db.session.commit()
            
            service = WorkoutTemplateService()
            templates = service.get_user_templates(user)
            
            assert len(templates) == 2
            # Should be ordered by created_at desc (newest first)
            assert templates[0]['name'] == "Template 2"
            assert templates[1]['name'] == "Template 1"
            
            # Check structure
            template_data = templates[0]
            assert 'id' in template_data
            assert 'name' in template_data
            assert 'created_at' in template_data
            assert 'exercises' in template_data
            assert len(template_data['exercises']) == 2  # Default exercises from factory
    
    def test_get_user_templates_isolation(self, app, multiple_users):
        """Test that users only see their own templates."""
        with app.app_context():
            user1, user2, user3 = [User.query.get(uid) for uid in multiple_users]
            
            # Create templates for different users
            TemplateFactory.create(user=user1, name="User 1 Template")
            TemplateFactory.create(user=user2, name="User 2 Template")
            TemplateFactory.create(user=user3, name="User 3 Template")
            db.session.commit()
            
            service = WorkoutTemplateService()
            
            # Each user should only see their own template
            user1_templates = service.get_user_templates(user1)
            user2_templates = service.get_user_templates(user2)
            user3_templates = service.get_user_templates(user3)
            
            assert len(user1_templates) == 1
            assert len(user2_templates) == 1
            assert len(user3_templates) == 1
            
            assert user1_templates[0]['name'] == "User 1 Template"
            assert user2_templates[0]['name'] == "User 2 Template"
            assert user3_templates[0]['name'] == "User 3 Template"
    
    def test_get_template_success(self, app, test_user, test_template):
        """Test getting a specific template."""
        with app.app_context():
            user = User.query.get(test_user)
            service = WorkoutTemplateService()
            template_data = service.get_template(test_template.id, user)
            
            assert template_data is not None
            assert template_data['id'] == test_template.id
            assert template_data['name'] == test_template.name
            assert len(template_data['exercises']) > 0
    
    def test_get_template_not_found(self, app, test_user):
        """Test getting non-existent template."""
        with app.app_context():
            user = User.query.get(test_user)
            service = WorkoutTemplateService()
            template_data = service.get_template(99999, user)
            
            assert template_data is None
    
    def test_get_template_wrong_user(self, app, multiple_users):
        """Test getting template that belongs to another user."""
        with app.app_context():
            user1, user2, _ = [User.query.get(uid) for uid in multiple_users]
            
            # Create template for user1
            template = TemplateFactory.create(user=user1)
            db.session.commit()
            
            service = WorkoutTemplateService()
            # Try to get template as user2
            template_data = service.get_template(template.id, user2)
            
            assert template_data is None
    
    def test_create_template_success(self, app, test_user):
        """Test successful template creation."""
        with app.app_context():
            user = User.query.get(test_user)
            template_data = {
                'name': 'New Template',
                'exercises': [
                    {
                        'exercise_name': 'Push-ups',
                        'default_weight': 0,
                        'default_reps': 20,
                        'default_sets': 3
                    },
                    {
                        'exercise_name': 'Pull-ups',
                        'default_weight': 0,
                        'default_reps': 10,
                        'default_sets': 3
                    }
                ]
            }
            
            service = WorkoutTemplateService()
            success, result, message = service.create_template(user, template_data)
            
            assert success is True
            assert result is not None
            assert result['name'] == 'New Template'
            assert len(result['exercises']) == 2
            assert 'created successfully' in message
            
            # Verify in database
            template = Template.query.filter_by(name='New Template').first()
            assert template is not None
            assert template.user_id == user.id
            assert len(template.exercises) == 2
    
    def test_create_template_missing_name(self, app, test_user):
        """Test template creation without name."""
        with app.app_context():
            user = User.query.get(test_user)
            template_data = {
                'exercises': []
            }
            
            service = WorkoutTemplateService()
            success, result, message = service.create_template(user, template_data)
            
            assert success is False
            assert result is None
            assert 'name is required' in message
    
    def test_create_template_empty_exercises(self, app, test_user):
        """Test template creation with no exercises."""
        with app.app_context():
            user = User.query.get(test_user)
            template_data = {
                'name': 'Empty Template',
                'exercises': []
            }
            
            service = WorkoutTemplateService()
            success, result, message = service.create_template(user, template_data)
            
            assert success is True
            assert result is not None
            assert len(result['exercises']) == 0
    
    def test_update_template_success(self, app, test_user, test_template):
        """Test successful template update."""
        with app.app_context():
            user = User.query.get(test_user)
            update_data = {
                'name': 'Updated Template Name',
                'exercises': [
                    {
                        'exercise_name': 'New Exercise',
                        'default_weight': 50,
                        'default_reps': 15,
                        'default_sets': 4
                    }
                ]
            }
            
            service = WorkoutTemplateService()
            success, result, message = service.update_template(
                test_template.id, user, update_data
            )
            
            assert success is True
            assert result['name'] == 'Updated Template Name'
            assert len(result['exercises']) == 1
            assert result['exercises'][0]['exercise_name'] == 'New Exercise'
            assert 'updated successfully' in message
    
    def test_update_template_not_found(self, app, test_user):
        """Test updating non-existent template."""
        with app.app_context():
            user = User.query.get(test_user)
            update_data = {'name': 'Updated Name'}
            
            service = WorkoutTemplateService()
            success, result, message = service.update_template(
                99999, user, update_data
            )
            
            assert success is False
            assert result is None
            assert 'not found' in message
    
    def test_update_template_wrong_user(self, app, multiple_users):
        """Test updating template that belongs to another user."""
        with app.app_context():
            user1, user2, _ = [User.query.get(uid) for uid in multiple_users]
            
            # Create template for user1
            template = TemplateFactory.create(user=user1)
            db.session.commit()
            
            update_data = {'name': 'Hacked Name'}
            service = WorkoutTemplateService()
            success, result, message = service.update_template(
                template.id, user2, update_data
            )
            
            assert success is False
            assert result is None
            assert 'not found' in message
    
    def test_delete_template_success(self, app, test_user, test_template):
        """Test successful template deletion."""
        with app.app_context():
            user = User.query.get(test_user)
            template_id = test_template.id
            template_name = test_template.name
            
            service = WorkoutTemplateService()
            success, message = service.delete_template(template_id, user)
            
            assert success is True
            assert 'deleted successfully' in message
            
            # Verify template is deleted
            template = Template.query.get(template_id)
            assert template is None
    
    def test_delete_template_not_found(self, app, test_user):
        """Test deleting non-existent template."""
        with app.app_context():
            user = User.query.get(test_user)
            service = WorkoutTemplateService()
            success, message = service.delete_template(99999, user)
            
            assert success is False
            assert 'not found' in message
    
    def test_delete_template_wrong_user(self, app, multiple_users):
        """Test deleting template that belongs to another user."""
        with app.app_context():
            user1, user2, _ = [User.query.get(uid) for uid in multiple_users]
            
            # Create template for user1
            template = TemplateFactory.create(user=user1)
            db.session.commit()
            
            service = WorkoutTemplateService()
            success, message = service.delete_template(template.id, user2)
            
            assert success is False
            assert 'not found' in message
            
            # Verify template still exists
            existing_template = Template.query.get(template.id)
            assert existing_template is not None
    
    def test_template_serialization(self, app, test_user):
        """Test that template serialization includes all required fields."""
        with app.app_context():
            user = User.query.get(test_user)
            # Create template with specific exercise data
            exercises = [
                {
                    'exercise_name': 'Bench Press',
                    'default_weight': 80.5,
                    'default_reps': 8,
                    'default_sets': 3
                },
                {
                    'exercise_name': 'Squats',
                    'default_weight': 100.0,
                    'default_reps': 10,
                    'default_sets': 4
                }
            ]
            
            template = TemplateFactory.create(
                user=user,
                name="Serialization Test",
                exercises=exercises
            )
            db.session.commit()
            
            service = WorkoutTemplateService()
            result = service.get_template(template.id, user)
            
            # Check template fields
            assert result['id'] == template.id
            assert result['name'] == "Serialization Test"
            assert 'created_at' in result
            
            # Check exercises
            assert len(result['exercises']) == 2
            exercise = result['exercises'][0]
            assert 'id' in exercise
            assert exercise['exercise_name'] == 'Bench Press'
            assert exercise['default_weight'] == 80.5
            assert exercise['default_reps'] == 8
            assert exercise['default_sets'] == 3
            assert exercise['order_index'] == 0
