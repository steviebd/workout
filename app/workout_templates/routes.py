from flask import request, jsonify
from flask_login import login_required, current_user
from app.workout_templates import bp
from app.models import Template, TemplateExercise
from app.core import db, csrf
from app.validators import validate_template_data, ValidationError, validation_error_response

@bp.route('/templates', methods=['GET'])
@login_required
def get_templates():
    templates = Template.query.filter_by(user_id=current_user.id).order_by(Template.created_at.desc()).all()
    return jsonify([{
        'id': t.id,
        'name': t.name,
        'created_at': t.created_at.isoformat(),
        'exercises': [{
            'id': e.id,
            'exercise_name': e.exercise_name,
            'default_weight': e.default_weight,
            'default_reps': e.default_reps,
            'default_sets': e.default_sets,
            'order_index': e.order_index
        } for e in t.exercises]
    } for t in templates])

@bp.route('/templates', methods=['POST'])
@login_required
@csrf.exempt
def create_template():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate input data
        validated_data = validate_template_data(data)
        
        if 'name' not in validated_data:
            return jsonify({'error': 'Template name is required'}), 400
        
        template = Template(
            user_id=current_user.id,
            name=validated_data['name']
        )
        db.session.add(template)
        db.session.flush()  # Get the template ID
        
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
        }), 201
    
    except ValidationError as e:
        return validation_error_response(str(e))
    except Exception as e:
        return jsonify({'error': 'Template creation failed'}), 500

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
    template = Template.query.filter_by(id=template_id, user_id=current_user.id).first()
    if not template:
        return jsonify({'error': 'Template not found'}), 404
    
    db.session.delete(template)
    db.session.commit()
    
    return jsonify({'success': True})
