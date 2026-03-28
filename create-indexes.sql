-- Create indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_workouts_workos_id_is_deleted_started_at ON workouts(workos_id, is_deleted, started_at);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_exercise_id ON workout_sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_complete ON workout_sets(is_complete, weight, reps);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
