from flask import Blueprint

bp = Blueprint('templates', __name__)

from app.templates import routes
