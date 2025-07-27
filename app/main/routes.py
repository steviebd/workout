from flask import render_template, redirect, url_for, request
from flask_login import login_required, current_user
from app.main import bp

@bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return redirect(url_for('auth.login'))

@bp.route('/dashboard')
@login_required
def dashboard():
    # Check if user needs to change password
    if hasattr(current_user, 'force_password_change') and current_user.force_password_change:
        return redirect(url_for('settings.change_password_page'))
    return render_template('dashboard.html')
