from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    force_password_change = db.Column(db.Boolean, default=False, nullable=False)
    
    # Relationships
    templates = db.relationship('Template', backref='user', lazy=True, cascade='all, delete-orphan')
    workouts = db.relationship('Workout', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Template(db.Model):
    __tablename__ = 'templates'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    exercises = db.relationship('TemplateExercise', backref='template', lazy=True, 
                               cascade='all, delete-orphan', order_by='TemplateExercise.order_index')
    workouts = db.relationship('Workout', backref='template', lazy=True)
    
    def __repr__(self):
        return f'<Template {self.name}>'

class TemplateExercise(db.Model):
    __tablename__ = 'template_exercises'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('templates.id'), nullable=False)
    exercise_name = db.Column(db.String(100), nullable=False)
    default_weight = db.Column(db.Float, default=0)
    default_reps = db.Column(db.Integer, default=0)
    default_sets = db.Column(db.Integer, default=0)
    order_index = db.Column(db.Integer, default=0)
    
    def __repr__(self):
        return f'<TemplateExercise {self.exercise_name}>'

class Workout(db.Model):
    __tablename__ = 'workouts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('templates.id'), nullable=True)
    performed_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text, default='')
    
    # Relationships
    exercises = db.relationship('WorkoutExercise', backref='workout', lazy=True,
                               cascade='all, delete-orphan', order_by='WorkoutExercise.order_index')
    
    def __repr__(self):
        return f'<Workout {self.id} - {self.performed_at}>'

class WorkoutExercise(db.Model):
    __tablename__ = 'workout_exercises'
    
    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey('workouts.id'), nullable=False)
    exercise_name = db.Column(db.String(100), nullable=False)
    weight = db.Column(db.Float, default=0)
    reps = db.Column(db.Integer, default=0)
    sets = db.Column(db.Integer, default=0)
    order_index = db.Column(db.Integer, default=0)
    
    def __repr__(self):
        return f'<WorkoutExercise {self.exercise_name}>'
