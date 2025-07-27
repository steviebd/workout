from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, logout_user, current_user
from app.auth import bp
from app.models import User, PasswordResetToken
from app import db, limiter, csrf
from app.validators import validate_user_data, ValidationError, validation_error_response
from app.email import send_password_reset_email

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

@bp.route('/forgot-password', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
@csrf.exempt
def forgot_password():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        try:
            if request.is_json:
                data = request.get_json()
            else:
                data = {'email': request.form.get('email')}
            
            email = data.get('email', '').strip().lower()
            
            if not email:
                if request.is_json:
                    return jsonify({'error': 'Email address required'}), 400
                flash('Email address required', 'error')
                return render_template('auth/forgot_password.html')
            
            # Always show success message for security (don't reveal if email exists)
            success_message = 'If an account with that email exists, we\'ve sent a password reset link.'
            
            # Look up user by email
            user = User.query.filter_by(email=email).first()
            
            if user:
                # Generate and send reset token
                reset_token = PasswordResetToken.generate_token(user)
                send_password_reset_email(user, reset_token)
            
            if request.is_json:
                return jsonify({'success': True, 'message': success_message})
            flash(success_message, 'success')
            return redirect(url_for('auth.login'))
            
        except Exception as e:
            if request.is_json:
                return jsonify({'error': 'Request failed. Please try again.'}), 500
            flash('Request failed. Please try again.', 'error')
    
    return render_template('auth/forgot_password.html')

@bp.route('/reset-password', methods=['GET', 'POST'])
@bp.route('/reset-password/<token>', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
@csrf.exempt
def reset_password(token=None):
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    # Get token from URL parameter or form data
    if not token and request.method == 'POST':
        if request.is_json:
            token = request.get_json().get('token')
        else:
            token = request.form.get('token')
    
    if not token:
        flash('Invalid or missing reset token', 'error')
        return redirect(url_for('auth.forgot_password'))
    
    # Validate token
    reset_token = PasswordResetToken.query.filter_by(token=token).first()
    
    if not reset_token or not reset_token.is_valid():
        flash('Invalid or expired reset token', 'error')
        return redirect(url_for('auth.forgot_password'))
    
    if request.method == 'POST':
        try:
            if request.is_json:
                data = request.get_json()
            else:
                data = {
                    'password': request.form.get('password'),
                    'token': request.form.get('token')
                }
            
            password = data.get('password')
            
            if not password:
                if request.is_json:
                    return jsonify({'error': 'Password required'}), 400
                flash('Password required', 'error')
                return render_template('auth/reset_password.html', token=token)
            
            if len(password) < 8:
                if request.is_json:
                    return jsonify({'error': 'Password must be at least 8 characters long'}), 400
                flash('Password must be at least 8 characters long', 'error')
                return render_template('auth/reset_password.html', token=token)
            
            # Update user password
            user = reset_token.user
            user.set_password(password)
            user.force_password_change = False  # Clear any forced password change
            
            # Mark token as used
            reset_token.use_token()
            
            db.session.commit()
            
            if request.is_json:
                return jsonify({'success': True, 'message': 'Password updated successfully'})
            flash('Password updated successfully', 'success')
            return redirect(url_for('auth.login'))
            
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'error': 'Password reset failed. Please try again.'}), 500
            flash('Password reset failed. Please try again.', 'error')
    
    return render_template('auth/reset_password.html', token=token)
