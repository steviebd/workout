from flask import request, jsonify, render_template
from flask_login import login_required, current_user
from app.settings import bp
from app.models import User
from app import db, limiter, csrf
from app.validators import validate_user_data, ValidationError, validation_error_response

@bp.route('/change-password', methods=['GET'])
@login_required
def change_password_page():
    return render_template('settings/change_password.html')

@bp.route('/password', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
@csrf.exempt
def change_password():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate input data
        validated_data = validate_user_data(data)
        
        if 'current_password' not in validated_data or 'new_password' not in validated_data:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        if not current_user.check_password(validated_data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        current_user.set_password(validated_data['new_password'])
        
        # Reset force password change flag if it was set
        if hasattr(current_user, 'force_password_change'):
            current_user.force_password_change = False
        
        db.session.commit()
        
        return jsonify({'success': True})
    
    except ValidationError as e:
        return validation_error_response(str(e))
    except Exception as e:
        return jsonify({'error': 'Password change failed'}), 500

@bp.route('/profile', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
@csrf.exempt
def update_profile():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update email if provided
        email = data.get('email', '').strip().lower() if data.get('email') else None
        
        # Check if email is already in use by another user
        if email:
            existing_user = User.query.filter(User.email == email, User.id != current_user.id).first()
            if existing_user:
                return jsonify({'error': 'Email address is already in use'}), 400
        
        # Update current user's email
        current_user.email = email
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Profile updated successfully'})
    
    except Exception as e:
        return jsonify({'error': 'Profile update failed'}), 500

# Admin routes
@bp.route('/admin/users', methods=['GET'])
@login_required
@csrf.exempt
def get_users():
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'is_admin': u.is_admin
    } for u in users])

@bp.route('/admin/users', methods=['POST'])
@login_required
@csrf.exempt
def create_user():
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    # Check email uniqueness if provided
    email = data.get('email', '').strip().lower() if data.get('email') else None
    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email address already exists'}), 400
    
    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    user = User(
        username=data['username'],
        email=email,
        is_admin=data.get('is_admin', False),
        force_password_change=data.get('force_password_change', False)
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_admin': user.is_admin
    }), 201

@bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@login_required
@csrf.exempt
def update_user(user_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update username if provided
    if 'username' in data:
        if data['username'] != user.username:
            if User.query.filter_by(username=data['username']).first():
                return jsonify({'error': 'Username already exists'}), 400
            user.username = data['username']
    
    # Update email if provided
    if 'email' in data:
        email = data['email'].strip().lower() if data['email'] else None
        if email != user.email:
            if email and User.query.filter(User.email == email, User.id != user.id).first():
                return jsonify({'error': 'Email address already exists'}), 400
            user.email = email
    
    # Update admin status if provided
    if 'is_admin' in data:
        user.is_admin = data['is_admin']
    
    # Update force password change flag if provided
    if 'force_password_change' in data:
        user.force_password_change = data['force_password_change']
    
    # Update password if provided
    if 'password' in data:
        if len(data['password']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        user.set_password(data['password'])
    
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_admin': user.is_admin
    })

@bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@login_required
@csrf.exempt
def delete_user(user_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    # Prevent self-deletion
    if user_id == current_user.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'success': True})
