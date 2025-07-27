from flask import Blueprint

bp = Blueprint('workout_templates', __name__)

from app.workout_templates import routes
