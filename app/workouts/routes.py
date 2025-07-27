from flask import request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import desc
from app.workouts import bp
from app.models import Workout, WorkoutExercise, Template, TemplateExercise
from app import db, csrf

@bp.route('/workouts/start', methods=['POST'])
@login_required
@csrf.exempt
def start_workout():
    data = request.get_json()
    template_id = data.get('template_id') if data else None
    
    # Create new workout
    workout = Workout(
        user_id=current_user.id,
        template_id=template_id,
        notes=''
    )
    db.session.add(workout)
    db.session.flush()  # Get the workout ID
    
    if template_id:
        # Copy exercises from template
        template = Template.query.filter_by(id=template_id, user_id=current_user.id).first()
        if template:
            for template_exercise in template.exercises:
                # Get last recorded values for this exercise
                last_workout_exercise = WorkoutExercise.query.join(Workout)\
                    .filter(Workout.user_id == current_user.id)\
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
                db.session.add(workout_exercise)
    
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
    }), 201

@bp.route('/workouts/<int:workout_id>', methods=['GET'])
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

@bp.route('/workouts/<int:workout_id>', methods=['PUT'])
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

@bp.route('/workouts/history', methods=['GET'])
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
