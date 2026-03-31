-- Drop redundant indexes (leftmost prefix rule, low-selectivity booleans, duplicates)
DROP INDEX IF EXISTS idx_exercises_workos_id;
DROP INDEX IF EXISTS idx_exercises_name;
DROP INDEX IF EXISTS idx_exercises_is_deleted;
DROP INDEX IF EXISTS idx_exercises_library_id;
DROP INDEX IF EXISTS idx_templates_workos_id;
DROP INDEX IF EXISTS idx_templates_is_deleted;
DROP INDEX IF EXISTS idx_workouts_workos_id;
DROP INDEX IF EXISTS idx_workouts_is_deleted;
DROP INDEX IF EXISTS idx_workout_exercises_workout_id;
DROP INDEX IF EXISTS idx_workout_sets_workout_exercise_id;
DROP INDEX IF EXISTS idx_workout_sets_exercise_complete;
DROP INDEX IF EXISTS idx_workout_sets_complete;
DROP INDEX IF EXISTS idx_user_program_cycles_status;
DROP INDEX IF EXISTS idx_program_cycle_workouts_cycle_id;
DROP INDEX IF EXISTS idx_whoop_webhook_events_type;
