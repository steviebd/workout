# Workout Tracker

A single-container web application for tracking workouts with reusable templates. Built with Flask, PostgreSQL, and Bootstrap with a dark theme design optimized for mobile devices.

## Features

- **User Authentication**: Login-only system with admin capabilities
- **Workout Templates**: Create reusable workout templates with exercises
- **Workout Sessions**: Start workouts from templates with last-recorded values pre-filled
- **History Tracking**: View and edit past workout sessions
- **User Management**: Admin users can manage other users
- **Mobile-First Design**: Dark Bootstrap theme optimized for touch devices

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd workout-tracker
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Open your browser to `http://localhost:5000`
   - Login with default credentials:
     - Username: `admin`
     - Password: `admin`

### Development Setup

For development without Docker:

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up PostgreSQL database**
   ```bash
   # Update DATABASE_URL in .env to point to your PostgreSQL instance
   ```

3. **Initialize database**
   ```bash
   export FLASK_APP=workout_app.py
   flask db upgrade
   ```

4. **Create admin user**
   ```bash
   python3 -c "
   from app import create_app, db
   from app.models import User
   app = create_app()
   with app.app_context():
       admin = User(username='admin', is_admin=True)
       admin.set_password('admin')
       db.session.add(admin)
       db.session.commit()
   "
   ```

5. **Run the application**
   ```bash
   python3 workout_app.py
   ```

## Usage

### Templates
- Create workout templates with exercises
- Set default weights, reps, and sets for each exercise
- Edit or delete existing templates

### Workouts
- Start a new workout session from any template
- Exercise values are pre-filled with last recorded data
- All fields are editable with touch-friendly number steppers
- Add notes to workout sessions

### History
- View paginated list of past workouts
- Click to view and edit previous sessions
- See workout date, template used, and exercise count

### Settings
- Change your password
- **Admin users only**: Manage other users (add, edit, delete)

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Templates
- `GET /templates/templates` - List user's templates
- `POST /templates/templates` - Create new template
- `PUT /templates/templates/<id>` - Update template
- `DELETE /templates/templates/<id>` - Delete template

### Workouts
- `POST /workouts/workouts/start` - Start new workout from template
- `GET /workouts/workouts/<id>` - Get workout details
- `PUT /workouts/workouts/<id>` - Update workout session
- `GET /workouts/workouts/history` - Get workout history (paginated)

### Settings
- `POST /settings/settings/password` - Change password
- `GET /settings/admin/users` - List users (admin only)
- `POST /settings/admin/users` - Create user (admin only)
- `PUT /settings/admin/users/<id>` - Update user (admin only)
- `DELETE /settings/admin/users/<id>` - Delete user (admin only)

## Database Schema

### Users
- `id` (Primary Key)
- `username` (Unique)
- `password_hash`
- `is_admin` (Boolean)

### Templates
- `id` (Primary Key)
- `user_id` (Foreign Key → users.id)
- `name`
- `created_at`

### Template Exercises
- `id` (Primary Key)
- `template_id` (Foreign Key → templates.id)
- `exercise_name`
- `default_weight`
- `default_reps`
- `default_sets`
- `order_index`

### Workouts
- `id` (Primary Key)
- `user_id` (Foreign Key → users.id)
- `template_id` (Foreign Key → templates.id, nullable)
- `performed_at`
- `notes`

### Workout Exercises
- `id` (Primary Key)
- `workout_id` (Foreign Key → workouts.id)
- `exercise_name`
- `weight`
- `reps`
- `sets`
- `order_index`

## Technology Stack

- **Backend**: Flask, SQLAlchemy, Flask-Login, Flask-Migrate
- **Database**: PostgreSQL 15
- **Frontend**: Bootstrap 5 (dark theme), vanilla JavaScript
- **Containerization**: Docker, Docker Compose

## Configuration

Environment variables (see `.env.example`):

- `SECRET_KEY` - Flask secret key for sessions
- `DATABASE_URL` - PostgreSQL connection string
- `FLASK_DEBUG` - Enable/disable debug mode

## Security Features

- Password hashing with Werkzeug
- Session-based authentication
- Admin-only routes protection
- SQL injection prevention with SQLAlchemy ORM
- CSRF protection considerations

## Mobile Optimization

- Touch-friendly interface with large buttons
- Number steppers for easy value adjustment
- Sticky bottom navigation
- Mobile-first responsive design
- Dark theme for better battery life

## Administration

### User Management
Admin users can:
- Add new users with custom usernames and passwords
- Toggle admin privileges for users
- Reset user passwords
- Delete users (except themselves)

### Default Admin Account
- **Username**: admin
- **Password**: admin
- **Important**: Change the default password after first login

## Backup & Maintenance

### Database Backup
```bash
docker-compose exec db pg_dump -U postgres workout_tracker > backup.sql
```

### Database Restore
```bash
docker-compose exec -T db psql -U postgres workout_tracker < backup.sql
```

### Update Application
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Ensure PostgreSQL container is running
   - Check DATABASE_URL configuration

2. **Permission denied on entrypoint.sh**
   ```bash
   chmod +x entrypoint.sh
   ```

3. **Missing migrations**
   ```bash
   docker-compose exec web flask db upgrade
   ```

4. **Admin user not created**
   - Check container logs for initialization errors
   - Manually create admin user using development setup steps

### Logs
```bash
# View application logs
docker-compose logs web

# View database logs
docker-compose logs db

# Follow logs in real-time
docker-compose logs -f
```

## License

This project is licensed under the MIT License.
