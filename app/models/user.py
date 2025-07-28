"""
User-related database models.
"""
from datetime import datetime, timedelta
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

from app.core import db

class User(UserMixin, db.Model):
    """User model for authentication and user management."""
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    force_password_change = db.Column(db.Boolean, default=False, nullable=False)
    
    # Relationships
    templates = db.relationship('Template', backref='user', lazy=True, cascade='all, delete-orphan')
    workouts = db.relationship('Workout', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password: str) -> None:
        """
        Hash and set the user's password.
        
        Args:
            password: Plain text password to hash and store
        """
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """
        Check if provided password matches stored hash.
        
        Args:
            password: Plain text password to verify
            
        Returns:
            bool: True if password matches, False otherwise
        """
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self) -> str:
        return f'<User {self.username}>'

class PasswordResetToken(db.Model):
    """Model for managing password reset tokens."""
    
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='password_reset_tokens')
    
    @staticmethod
    def generate_token(user: User) -> 'PasswordResetToken':
        """
        Generate a new password reset token for a user.
        
        Args:
            user: User to generate token for
            
        Returns:
            PasswordResetToken: New password reset token
        """
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        db.session.add(reset_token)
        db.session.commit()
        return reset_token
    
    def is_valid(self) -> bool:
        """
        Check if the token is still valid (not used and not expired).
        
        Returns:
            bool: True if token is valid, False otherwise
        """
        return not self.used and datetime.utcnow() < self.expires_at
    
    def use_token(self) -> None:
        """Mark the token as used."""
        self.used = True
        db.session.commit()
    
    def __repr__(self) -> str:
        return f'<PasswordResetToken {self.token[:8]}...>'
