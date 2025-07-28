from typing import Union

from flask import request, jsonify, Response
from flask_login import login_required, current_user

from app.workout_templates import bp
from app.models import Template, TemplateExercise
from app.core import db, csrf
from app.validators import validate_template_data, ValidationError, validation_error_response
from app.services import WorkoutTemplateService, ResponseService

@bp.route('/templates', methods=['GET'])
@login_required
def get_templates() -> Union[Response, tuple]:
    """
    Retrieve all workout templates for the current user.
    
    Returns:
        JSON response containing user's templates with exercises
    """
    template_service = WorkoutTemplateService()
    templates = template_service.get_user_templates(current_user)
    return ResponseService.success_response(data=templates)

@bp.route('/templates', methods=['POST'])
@login_required
@csrf.exempt
def create_template():
    data = request.get_json()
    if not data:
        return ResponseService.error_response('No data provided')
    
    template_service = WorkoutTemplateService()
    success, template_data, message = template_service.create_template(current_user, data)
    
    if success:
        return ResponseService.success_response(
            data=template_data,
            message=message,
            status_code=201
        )
    else:
        return ResponseService.error_response(message)

@bp.route('/templates/<int:template_id>', methods=['PUT'])
@login_required
@csrf.exempt
def update_template(template_id):
    try:
        template = Template.query.filter_by(id=template_id, user_id=current_user.id).first()
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate input data
        validated_data = validate_template_data(data)
        
        # Update template name
        if 'name' in validated_data:
            template.name = validated_data['name']
        
        # Update exercises
        if 'exercises' in validated_data:
            # Delete existing exercises
            TemplateExercise.query.filter_by(template_id=template.id).delete()
            
            # Add new exercises
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
                db.session.add(exercise)
        
        db.session.commit()
        
        return jsonify({
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
        })
    
    except ValidationError as e:
        return validation_error_response(str(e))
    except Exception as e:
        return jsonify({'error': 'Template update failed'}), 500

@bp.route('/templates/<int:template_id>', methods=['DELETE'])
@login_required
@csrf.exempt
def delete_template(template_id):
    template_service = WorkoutTemplateService()
    success, message = template_service.delete_template(template_id, current_user)
    
    if success:
        return ResponseService.success_response(message=message)
    else:
        return ResponseService.error_response(message, status_code=404)
