from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_login import current_user
from app.auth import bp
from app.core import limiter, csrf
from app.services import AuthService, ResponseService

@bp.route('/login', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
@csrf.exempt
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        # Get login data
        if request.is_json:
            data = request.get_json() or {}
        else:
            data = {
                'username': request.form.get('username'),
                'password': request.form.get('password')
            }
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        # Use auth service to authenticate
        auth_service = AuthService()
        success, user, context = auth_service.login_user(username, password)
        
        if success:
            # Handle force password change
            if context.get('force_password_change'):
                if request.is_json:
                    return jsonify({
                        'success': True,
                        'force_password_change': True,
                        'redirect': context['redirect_url']
                    })
                flash('You must change your password before continuing', 'warning')
                return redirect(context['redirect_url'])
            
            # Successful login
            next_page = request.args.get('next')
            redirect_url = next_page or context['redirect_url']
            
            if request.is_json:
                return jsonify({'success': True, 'redirect': redirect_url})
            return redirect(redirect_url)
        else:
            # Login failed
            error_message = context.get('error_message', 'Login failed')
            if request.is_json:
                return ResponseService.error_response(error_message, status_code=401)
            flash(error_message, 'error')
    
    return render_template('auth/login.html')

@bp.route('/logout', methods=['POST'])
@csrf.exempt
def logout():
    auth_service = AuthService()
    success = auth_service.logout_user()
    
    if request.is_json:
        if success:
            return ResponseService.success_response(message='Logged out successfully')
        else:
            return ResponseService.error_response('Logout failed')
    
    return redirect(url_for('auth.login'))

@bp.route('/forgot-password', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
@csrf.exempt
def forgot_password():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        # Get email data
        if request.is_json:
            data = request.get_json() or {}
        else:
            data = {'email': request.form.get('email')}
        
        email = data.get('email', '').strip().lower()
        
        # Use auth service to request password reset
        auth_service = AuthService()
        success, message = auth_service.request_password_reset(email)
        
        if request.is_json:
            if success:
                return ResponseService.success_response(message=message)
            else:
                return ResponseService.error_response(message)
        
        if success:
            flash(message, 'success')
            return redirect(url_for('auth.login'))
        else:
            flash(message, 'error')
    
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
