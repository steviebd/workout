FROM python:3.11-slim

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

# Change ownership of the app directory to appuser
RUN chown -R appuser:appuser /app

# Don't switch to appuser yet - entrypoint needs root to switch users
# USER appuser

# Expose port
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=workout_app.py
ENV PYTHONPATH=/app
ENV GUNICORN_CMD_ARGS="--config gunicorn.conf.py"

# Run entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
