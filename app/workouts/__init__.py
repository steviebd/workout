from flask import Blueprint

bp = Blueprint('workouts', __name__)

from app.workouts import routes
