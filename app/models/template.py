"""
Workout template-related database models.
"""
from datetime import datetime

from app.core import db

class Template(db.Model):
    """Model for workout templates."""
    
    __tablename__ = 'templates'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    exercises = db.relationship('TemplateExercise', backref='template', lazy=True, 
                               cascade='all, delete-orphan', order_by='TemplateExercise.order_index')
    workouts = db.relationship('Workout', backref='template', lazy=True)
    
    def __repr__(self) -> str:
        return f'<Template {self.name}>'

class TemplateExercise(db.Model):
    """Model for exercises within workout templates."""
    
    __tablename__ = 'template_exercises'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('templates.id'), nullable=False)
    exercise_name = db.Column(db.String(100), nullable=False)
    default_weight = db.Column(db.Float, default=0)
    default_reps = db.Column(db.Integer, default=0)
    default_sets = db.Column(db.Integer, default=0)
    order_index = db.Column(db.Integer, default=0)
    
    def __repr__(self) -> str:
        return f'<TemplateExercise {self.exercise_name}>'
