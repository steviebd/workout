"""
Workout-related database models.
"""
from datetime import datetime

from app.core import db

class Workout(db.Model):
    """Model for completed workouts."""
    
    __tablename__ = 'workouts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('templates.id'), nullable=True)
    performed_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text, default='')
    
    # Relationships
    exercises = db.relationship('WorkoutExercise', backref='workout', lazy=True,
                               cascade='all, delete-orphan', order_by='WorkoutExercise.order_index')
    
    def __repr__(self) -> str:
        return f'<Workout {self.id} - {self.performed_at}>'

class WorkoutExercise(db.Model):
    """Model for exercises performed in a workout."""
    
    __tablename__ = 'workout_exercises'
    
    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey('workouts.id'), nullable=False)
    exercise_name = db.Column(db.String(100), nullable=False)
    weight = db.Column(db.Float, default=0)
    reps = db.Column(db.Integer, default=0)
    sets = db.Column(db.Integer, default=0)
    order_index = db.Column(db.Integer, default=0)
    
    def __repr__(self) -> str:
        return f'<WorkoutExercise {self.exercise_name}>'
