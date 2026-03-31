-- Create indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_workouts_workos_id_is_deleted_started_at ON workouts(workos_id, is_deleted, started_at);
