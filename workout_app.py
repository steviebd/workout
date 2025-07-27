import os
from app import create_app
from app.core import db
from app.models import User, Template, TemplateExercise, Workout, WorkoutExercise

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {
        'db': db,
        'User': User,
        'Template': Template,
        'TemplateExercise': TemplateExercise,
        'Workout': Workout,
        'WorkoutExercise': WorkoutExercise
    }

if __name__ == '__main__':
    # Get debug mode from environment variable
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    
    app.run(host=host, port=port, debug=debug_mode)
