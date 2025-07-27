from flask import request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import desc
from app.workouts import bp
from app.models import Workout, WorkoutExercise, Template, TemplateExercise
from app.core import db, csrf
from app.services import WorkoutService, ResponseService

@bp.route('/start', methods=['POST'])
@login_required
@csrf.exempt
def start_workout():
    data = request.get_json()
    template_id = data.get('template_id') if data else None
    
    workout_service = WorkoutService()
    success, workout_data, message = workout_service.start_workout(current_user, template_id)
    
    if success:
        return ResponseService.success_response(
            data=workout_data,
            message=message,
            status_code=201
        )
    else:
        return ResponseService.error_response(message)

@bp.route('/<int:workout_id>', methods=['GET'])
@login_required
def get_workout(workout_id):
    workout = Workout.query.filter_by(id=workout_id, user_id=current_user.id).first()
    if not workout:
        return jsonify({'error': 'Workout not found'}), 404
    
    return jsonify({
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
    })

@bp.route('/<int:workout_id>', methods=['PUT'])
@login_required
@csrf.exempt
def update_workout(workout_id):
    workout = Workout.query.filter_by(id=workout_id, user_id=current_user.id).first()
    if not workout:
        return jsonify({'error': 'Workout not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update workout notes
    if 'notes' in data:
        workout.notes = data['notes']
    
    # Update exercises
    if 'exercises' in data:
        # Delete existing exercises
        WorkoutExercise.query.filter_by(workout_id=workout.id).delete()
        
        # Add updated exercises
        for i, exercise_data in enumerate(data['exercises']):
            exercise = WorkoutExercise(
                workout_id=workout.id,
                exercise_name=exercise_data.get('exercise_name', ''),
                weight=exercise_data.get('weight', 0),
                reps=exercise_data.get('reps', 0),
                sets=exercise_data.get('sets', 0),
                order_index=i
            )
            db.session.add(exercise)
    
    db.session.commit()
    
    return jsonify({
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
    })

@bp.route('/history', methods=['GET'])
@login_required
def get_workout_history():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    workouts = Workout.query.filter_by(user_id=current_user.id)\
        .order_by(desc(Workout.performed_at))\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'workouts': [{
            'id': w.id,
            'template_id': w.template_id,
            'template_name': w.template.name if w.template else None,
            'performed_at': w.performed_at.isoformat(),
            'notes': w.notes,
            'exercise_count': len(w.exercises)
        } for w in workouts.items],
        'total': workouts.total,
        'pages': workouts.pages,
        'current_page': workouts.page,
        'has_next': workouts.has_next,
        'has_prev': workouts.has_prev
    })
