from flask import request, jsonify
from flask_login import login_required, current_user
from app.templates import bp
from app.models import Template, TemplateExercise
from app import db

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
def create_template():
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Template name is required'}), 400
    
    template = Template(
        user_id=current_user.id,
        name=data['name']
    )
    db.session.add(template)
    db.session.flush()  # Get the template ID
    
    # Add exercises
    exercises = data.get('exercises', [])
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

@bp.route('/templates/<int:template_id>', methods=['PUT'])
@login_required
def update_template(template_id):
    template = Template.query.filter_by(id=template_id, user_id=current_user.id).first()
    if not template:
        return jsonify({'error': 'Template not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update template name
    if 'name' in data:
        template.name = data['name']
    
    # Update exercises
    if 'exercises' in data:
        # Delete existing exercises
        TemplateExercise.query.filter_by(template_id=template.id).delete()
        
        # Add new exercises
        for i, exercise_data in enumerate(data['exercises']):
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

@bp.route('/templates/<int:template_id>', methods=['DELETE'])
@login_required
def delete_template(template_id):
    template = Template.query.filter_by(id=template_id, user_id=current_user.id).first()
    if not template:
        return jsonify({'error': 'Template not found'}), 404
    
    db.session.delete(template)
    db.session.commit()
    
    return jsonify({'success': True})
