// Global variables
let currentTab = 'templates';
let currentTemplateId = null;
let currentWorkoutId = null;
let currentUserId = null;

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').style.display = 'block';
    
    // Add active class to current button
    if (event && event.target) {
        event.target.classList.remove('btn-outline-primary');
        event.target.classList.add('btn-primary');
    }
    
    currentTab = tabName;
    
    // Load content based on tab
    switch(tabName) {
        case 'workouts':
            loadWorkoutTemplates();
            break;
        case 'history':
            loadHistory();
            break;
        case 'templates':
            loadTemplates();
            break;
        case 'settings':
            if (document.getElementById('users-list')) {
                loadUsers();
            }
            break;
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Set initial active button state
    const workoutButton = document.querySelector('.btn-group .btn[onclick="showTab(\'workouts\')"]');
    if (workoutButton) {
        workoutButton.classList.remove('btn-outline-primary');
        workoutButton.classList.add('btn-primary');
    }
    showTab('workouts');
    
    // Password form handler
    document.getElementById('passwordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const data = {
            current_password: document.getElementById('currentPassword').value,
            new_password: document.getElementById('newPassword').value
        };
        
        try {
            const response = await fetch('/settings/settings/password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('Password updated successfully');
                document.getElementById('passwordForm').reset();
            } else {
                alert(result.error || 'Failed to update password');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
});

// Templates functions
async function loadTemplates() {
    try {
        const response = await fetch('/templates/templates');
        const templates = await response.json();
        
        const container = document.getElementById('templates-list');
        container.innerHTML = '';
        
        if (templates.length === 0) {
            container.innerHTML = '<p class="text-muted">No templates created yet.</p>';
            return;
        }
        
        templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'card mb-3';
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title">${template.name}</h5>
                            <p class="text-muted small">Created: ${new Date(template.created_at).toLocaleDateString()}</p>
                            <p class="text-muted">${template.exercises.length} exercises</p>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="editTemplate(${template.id})">Edit</a></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="deleteTemplate(${template.id})">Delete</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

function showCreateTemplate() {
    currentTemplateId = null;
    document.querySelector('#templateModal .modal-title').textContent = 'Create Template';
    document.getElementById('templateName').value = '';
    document.getElementById('exercises-container').innerHTML = '';
    addExercise(); // Add one empty exercise
    new bootstrap.Modal(document.getElementById('templateModal')).show();
}

async function editTemplate(templateId) {
    try {
        const response = await fetch(`/templates/templates`);
        const templates = await response.json();
        const template = templates.find(t => t.id === templateId);
        
        if (!template) return;
        
        currentTemplateId = templateId;
        document.querySelector('#templateModal .modal-title').textContent = 'Edit Template';
        document.getElementById('templateName').value = template.name;
        
        const container = document.getElementById('exercises-container');
        container.innerHTML = '';
        
        template.exercises.forEach(exercise => {
            addExercise(exercise);
        });
        
        if (template.exercises.length === 0) {
            addExercise();
        }
        
        new bootstrap.Modal(document.getElementById('templateModal')).show();
    } catch (error) {
        alert('Error loading template: ' + error.message);
    }
}

function addExercise(exercise = null) {
    const container = document.getElementById('exercises-container');
    const index = container.children.length;
    
    const exerciseDiv = document.createElement('div');
    exerciseDiv.className = 'exercise-item';
    exerciseDiv.innerHTML = `
        <div class="row">
            <div class="col-12 mb-2">
                <input type="text" class="form-control" placeholder="Exercise name" 
                       value="${exercise ? exercise.exercise_name : ''}" 
                       data-field="exercise_name">
            </div>
            <div class="col-4">
                <label class="form-label small">Weight</label>
                <input type="number" class="form-control" placeholder="Weight" step="0.5"
                       value="${exercise ? exercise.default_weight : ''}" 
                       data-field="default_weight">
            </div>
            <div class="col-4">
                <label class="form-label small">Reps</label>
                <input type="number" class="form-control" placeholder="Reps"
                       value="${exercise ? exercise.default_reps : ''}" 
                       data-field="default_reps">
            </div>
            <div class="col-4">
                <label class="form-label small">Sets</label>
                <input type="number" class="form-control" placeholder="Sets"
                       value="${exercise ? exercise.default_sets : ''}" 
                       data-field="default_sets">
            </div>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm mt-2" onclick="removeExercise(this)">
            <i class="bi bi-trash"></i> Remove
        </button>
    `;
    
    container.appendChild(exerciseDiv);
}

function removeExercise(button) {
    button.closest('.exercise-item').remove();
}

async function saveTemplate() {
    const name = document.getElementById('templateName').value;
    if (!name) {
        alert('Template name is required');
        return;
    }
    
    const exercises = [];
    document.querySelectorAll('.exercise-item').forEach(item => {
        const exercise = {};
        item.querySelectorAll('[data-field]').forEach(input => {
            const field = input.dataset.field;
            const value = input.value;
            if (field === 'exercise_name') {
                exercise[field] = value;
            } else {
                exercise[field] = parseFloat(value) || 0;
            }
        });
        if (exercise.exercise_name) {
            exercises.push(exercise);
        }
    });
    
    const data = { name, exercises };
    
    try {
        const url = currentTemplateId ? 
            `/templates/templates/${currentTemplateId}` : 
            '/templates/templates';
        const method = currentTemplateId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('templateModal')).hide();
            loadTemplates();
        } else {
            const result = await response.json();
            alert(result.error || 'Failed to save template');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
        const response = await fetch(`/templates/templates/${templateId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadTemplates();
        } else {
            alert('Failed to delete template');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Workouts functions
async function loadWorkoutTemplates() {
    try {
        const response = await fetch('/templates/templates');
        const templates = await response.json();
        
        const container = document.getElementById('workout-templates-list');
        container.innerHTML = '';
        
        if (templates.length === 0) {
            container.innerHTML = '<p class="text-muted">No templates available. Create a template first.</p>';
            return;
        }
        
        templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'card mb-3';
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${template.name}</h5>
                    <p class="text-muted">${template.exercises.length} exercises</p>
                    <button class="btn btn-primary" onclick="startWorkout(${template.id})">
                        <i class="bi bi-play-circle"></i> Start Workout
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading workout templates:', error);
    }
}

async function startWorkout(templateId) {
    try {
        const response = await fetch('/workouts/workouts/start', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({template_id: templateId})
        });
        
        const workout = await response.json();
        
        if (response.ok) {
            currentWorkoutId = workout.id;
            showWorkoutModal(workout);
        } else {
            alert(workout.error || 'Failed to start workout');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function showWorkoutModal(workout) {
    const container = document.getElementById('workout-exercises');
    container.innerHTML = '';
    
    workout.exercises.forEach((exercise, index) => {
        const exerciseDiv = document.createElement('div');
        exerciseDiv.className = 'exercise-item';
        exerciseDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">${exercise.exercise_name}</h6>
            </div>
            <div class="row">
                <div class="col-4">
                    <label class="form-label small">Weight</label>
                    <div class="number-input">
                        <button type="button" onclick="changeValue(this, -0.5)">-</button>
                        <input type="number" class="form-control" step="0.5" 
                               value="${exercise.weight}" data-field="weight">
                        <button type="button" onclick="changeValue(this, 0.5)">+</button>
                    </div>
                </div>
                <div class="col-4">
                    <label class="form-label small">Reps</label>
                    <div class="number-input">
                        <button type="button" onclick="changeValue(this, -1)">-</button>
                        <input type="number" class="form-control" 
                               value="${exercise.reps}" data-field="reps">
                        <button type="button" onclick="changeValue(this, 1)">+</button>
                    </div>
                </div>
                <div class="col-4">
                    <label class="form-label small">Sets</label>
                    <div class="number-input">
                        <button type="button" onclick="changeValue(this, -1)">-</button>
                        <input type="number" class="form-control" 
                               value="${exercise.sets}" data-field="sets">
                        <button type="button" onclick="changeValue(this, 1)">+</button>
                    </div>
                </div>
            </div>
            <input type="hidden" value="${exercise.exercise_name}" data-field="exercise_name">
        `;
        container.appendChild(exerciseDiv);
    });
    
    document.getElementById('workoutNotes').value = workout.notes || '';
    new bootstrap.Modal(document.getElementById('workoutModal')).show();
}

function changeValue(button, delta) {
    const input = button.parentElement.querySelector('input[type="number"]');
    const currentValue = parseFloat(input.value) || 0;
    const newValue = Math.max(0, currentValue + delta);
    input.value = newValue;
}

async function saveWorkout() {
    const exercises = [];
    document.querySelectorAll('#workout-exercises .exercise-item').forEach(item => {
        const exercise = {};
        item.querySelectorAll('[data-field]').forEach(input => {
            const field = input.dataset.field;
            const value = input.value;
            if (field === 'exercise_name') {
                exercise[field] = value;
            } else {
                exercise[field] = parseFloat(value) || 0;
            }
        });
        exercises.push(exercise);
    });
    
    const data = {
        exercises: exercises,
        notes: document.getElementById('workoutNotes').value
    };
    
    try {
        const response = await fetch(`/workouts/workouts/${currentWorkoutId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('workoutModal')).hide();
            alert('Workout saved successfully!');
        } else {
            const result = await response.json();
            alert(result.error || 'Failed to save workout');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// History functions
async function loadHistory() {
    try {
        const response = await fetch('/workouts/workouts/history');
        const data = await response.json();
        
        const container = document.getElementById('history-list');
        container.innerHTML = '';
        
        if (data.workouts.length === 0) {
            container.innerHTML = '<p class="text-muted">No workout history yet.</p>';
            return;
        }
        
        data.workouts.forEach(workout => {
            const card = document.createElement('div');
            card.className = 'card mb-3';
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title">${workout.template_name || 'Custom Workout'}</h6>
                            <p class="text-muted small">${new Date(workout.performed_at).toLocaleString()}</p>
                            <p class="text-muted">${workout.exercise_count} exercises</p>
                        </div>
                        <button class="btn btn-outline-primary btn-sm" onclick="viewWorkout(${workout.id})">
                            <i class="bi bi-eye"></i> View
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

async function viewWorkout(workoutId) {
    try {
        const response = await fetch(`/workouts/workouts/${workoutId}`);
        const workout = await response.json();
        
        if (response.ok) {
            currentWorkoutId = workoutId;
            showWorkoutModal(workout);
        } else {
            alert(workout.error || 'Failed to load workout');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// User management functions
async function loadUsers() {
    try {
        const response = await fetch('/settings/admin/users');
        const users = await response.json();
        
        const container = document.getElementById('users-list');
        container.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('div');
            row.className = 'd-flex justify-content-between align-items-center py-2 border-bottom';
            row.innerHTML = `
                <div>
                    <strong>${user.username}</strong>
                    ${user.is_admin ? '<span class="badge bg-primary ms-2">Admin</span>' : ''}
                </div>
                <div>
                    <button class="btn btn-outline-primary btn-sm me-2" onclick="editUser(${user.id})">Edit</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteUser(${user.id})">Delete</button>
                </div>
            `;
            container.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function showCreateUser() {
    currentUserId = null;
    document.querySelector('#userModal .modal-title').textContent = 'Add User';
    document.getElementById('userForm').reset();
    new bootstrap.Modal(document.getElementById('userModal')).show();
}

async function editUser(userId) {
    try {
        const response = await fetch('/settings/admin/users');
        const users = await response.json();
        const user = users.find(u => u.id === userId);
        
        if (!user) return;
        
        currentUserId = userId;
        document.querySelector('#userModal .modal-title').textContent = 'Edit User';
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userPassword').value = '';
        document.getElementById('userIsAdmin').checked = user.is_admin;
        
        new bootstrap.Modal(document.getElementById('userModal')).show();
    } catch (error) {
        alert('Error loading user: ' + error.message);
    }
}

async function saveUser() {
    const data = {
        username: document.getElementById('userUsername').value,
        is_admin: document.getElementById('userIsAdmin').checked
    };
    
    const password = document.getElementById('userPassword').value;
    if (password || !currentUserId) {
        data.password = password;
    }
    
    if (!data.username) {
        alert('Username is required');
        return;
    }
    
    if (!currentUserId && !password) {
        alert('Password is required for new users');
        return;
    }
    
    try {
        const url = currentUserId ? 
            `/settings/admin/users/${currentUserId}` : 
            '/settings/admin/users';
        const method = currentUserId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
            loadUsers();
        } else {
            const result = await response.json();
            alert(result.error || 'Failed to save user');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await fetch(`/settings/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadUsers();
        } else {
            const result = await response.json();
            alert(result.error || 'Failed to delete user');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/auth/logout', {method: 'POST'});
        if (response.ok) {
            window.location.href = '/auth/login';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}
