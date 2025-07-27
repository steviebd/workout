from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, logout_user, current_user
from app.auth import bp
from app.models import User
from app import db, limiter, csrf
from app.validators import validate_user_data, ValidationError, validation_error_response

@bp.route('/login', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
@csrf.exempt
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        try:
            if request.is_json:
                data = request.get_json()
            else:
                data = {
                    'username': request.form.get('username'),
                    'password': request.form.get('password')
                }
            
            # Basic validation
            if not data or not data.get('username') or not data.get('password'):
                if request.is_json:
                    return jsonify({'error': 'Username and password required'}), 400
                flash('Username and password required', 'error')
                return render_template('auth/login.html')
            
            username = data.get('username').strip()
            password = data.get('password')
            
            # Validate username format (basic check for login)
            if len(username) > 50:
                if request.is_json:
                    return jsonify({'error': 'Invalid credentials'}), 401
                flash('Invalid credentials', 'error')
                return render_template('auth/login.html')
            
            user = User.query.filter_by(username=username).first()
            
            if user and user.check_password(password):
                login_user(user)
                
                # Check if password change is required
                if hasattr(user, 'force_password_change') and user.force_password_change:
                    if request.is_json:
                        return jsonify({
                            'success': True, 
                            'force_password_change': True,
                            'redirect': url_for('settings.change_password_page')
                        })
                    flash('You must change your password before continuing', 'warning')
                    return redirect(url_for('settings.change_password_page'))
                
                next_page = request.args.get('next')
                if request.is_json:
                    return jsonify({'success': True, 'redirect': next_page or url_for('main.dashboard')})
                return redirect(next_page or url_for('main.dashboard'))
            else:
                if request.is_json:
                    return jsonify({'error': 'Invalid credentials'}), 401
                flash('Invalid credentials', 'error')
        
        except Exception as e:
            if request.is_json:
                return jsonify({'error': 'Login failed'}), 500
            flash('Login failed', 'error')
    
    return render_template('auth/login.html')

@bp.route('/logout', methods=['POST'])
@csrf.exempt
def logout():
    logout_user()
    if request.is_json:
        return jsonify({'success': True})
    return redirect(url_for('auth.login'))
