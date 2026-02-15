import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export function generateId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

// ============================================
// CORE ENTITIES
// ============================================
/**
 * Users table stores both:
 * - `id`: Local surrogate primary key (UUID, auto-generated). Used for foreign key relationships.
 * - `workosId`: The WorkOS user ID (immutable, from WorkOS auth). Used for ownership queries.
 *
 * IMPORTANT: All entity tables (exercises, workouts, templates, etc.) reference `workosId`
 * for row ownership, NOT `id`. This is because:
 * 1. WorkOS IDs are stable across auth provider changes
 * 2. They match the `session.sub` claim from JWT tokens
 *
 * When querying user data, filter by `workosId = session.sub`, not `users.id`.
 */
export const users = sqliteTable('users', {
  /** Local surrogate primary key (UUID). Rarely used for queries. */
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  /** The WorkOS user ID from auth. Use this for ownership filtering. */
  workosId: text('workos_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
});

export const userPreferences = sqliteTable('user_preferences', {
  workosId: text('workos_id').primaryKey().references(() => users.workosId, { onDelete: 'cascade' }),
  weightUnit: text('weight_unit').default('kg'),
  dateFormat: text('date_format').default('dd/mm/yyyy'),
  theme: text('theme').default('light'),
  weeklyWorkoutTarget: integer('weekly_workout_target').default(3),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

// ============================================
// EXERCISE LIBRARY
// ============================================
export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id').unique(),
  workosId: text('workos_id').notNull().references(() => users.workosId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  muscleGroup: text('muscle_group'),
  description: text('description'),
  libraryId: text('library_id'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

// ============================================
// TEMPLATES
// ============================================
export const templates = sqliteTable('templates', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id').unique(),
  workosId: text('workos_id').notNull().references(() => users.workosId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  notes: text('notes'),
  programCycleId: text('program_cycle_id'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => nowISO()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => nowISO()),
});

export const templateExercises = sqliteTable('template_exercises', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  templateId: text('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  targetWeight: real('target_weight'),
  addedWeight: real('added_weight').default(0),
  sets: integer('sets'),
  reps: integer('reps'),
  repsRaw: text('reps_raw'),
  isAmrap: integer('is_amrap', { mode: 'boolean' }).default(false),
  isAccessory: integer('is_accessory', { mode: 'boolean' }).default(false),
  isRequired: integer('is_required', { mode: 'boolean' }).default(true),
  setNumber: integer('set_number'),
});

// ============================================
// WORKOUTS
// ============================================
export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id').unique(),
  workosId: text('workos_id').notNull().references(() => users.workosId, { onDelete: 'cascade' }),
  templateId: text('template_id').references(() => templates.id, { onDelete: 'set null' }),
  programCycleId: text('program_cycle_id'),
  name: text('name').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  notes: text('notes'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
  squat1rm: real('squat_1rm'),
  bench1rm: real('bench_1rm'),
  deadlift1rm: real('deadlift_1rm'),
  ohp1rm: real('ohp_1rm'),
  startingSquat1rm: real('starting_squat_1rm'),
  startingBench1rm: real('starting_bench_1rm'),
  startingDeadlift1rm: real('starting_deadlift_1rm'),
  startingOhp1rm: real('starting_ohp_1rm'),
});

export const workoutExercises = sqliteTable('workout_exercises', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id').unique(),
  workoutId: text('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  notes: text('notes'),
  isAmrap: integer('is_amrap', { mode: 'boolean' }).default(false),
  setNumber: integer('set_number'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

export const workoutSets = sqliteTable('workout_sets', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id').unique(),
  workoutExerciseId: text('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  weight: real('weight'),
  reps: integer('reps'),
  rpe: real('rpe'),
  isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
  completedAt: text('completed_at'),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

// ============================================
// GAMIFICATION
// ============================================
export const userStreaks = sqliteTable('user_streaks', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  workosId: text('workos_id').notNull().unique().references(() => users.workosId, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastWorkoutDate: text('last_workout_date'),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

// ============================================
// PROGRAMS
// ============================================
export const userProgramCycles = sqliteTable('user_program_cycles', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  workosId: text('workos_id').notNull().references(() => users.workosId, { onDelete: 'cascade' }),
  programSlug: text('program_slug').notNull(),
  name: text('name').notNull(),
  squat1rm: real('squat_1rm').notNull(),
  bench1rm: real('bench_1rm').notNull(),
  deadlift1rm: real('deadlift_1rm').notNull(),
  ohp1rm: real('ohp_1rm').notNull(),
  startingSquat1rm: real('starting_squat_1rm'),
  startingBench1rm: real('starting_bench_1rm'),
  startingDeadlift1rm: real('starting_deadlift_1rm'),
  startingOhp1rm: real('starting_ohp_1rm'),
  currentWeek: integer('current_week').default(1),
  currentSession: integer('current_session').default(1),
  totalSessionsCompleted: integer('total_sessions_completed').default(0),
  totalSessionsPlanned: integer('total_sessions_planned').notNull(),
  status: text('status').default('active'),
  isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
  startedAt: text('started_at').$defaultFn(() => nowISO()),
  completedAt: text('completed_at'),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
  preferredGymDays: text('preferred_gym_days'),
  preferredTimeOfDay: text('preferred_time_of_day'),
  programStartDate: text('program_start_date'),
  firstSessionDate: text('first_session_date'),
});

export const programCycleWorkouts = sqliteTable('program_cycle_workouts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  cycleId: text('cycle_id').notNull().references(() => userProgramCycles.id, { onDelete: 'cascade' }),
  templateId: text('template_id').references(() => templates.id, { onDelete: 'cascade' }),
  weekNumber: integer('week_number').notNull(),
  sessionNumber: integer('session_number').notNull(),
  sessionName: text('session_name').notNull(),
  targetLifts: text('target_lifts'),
  isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
  workoutId: text('workout_id'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  scheduledDate: text('scheduled_date'),
  scheduledTime: text('scheduled_time'),
});

// ============================================
// INDEXES
// ============================================
export const _exercisesWorkosIdIdx = index('idx_exercises_workos_id').on(exercises.workosId);
export const _exercisesNameMuscleGroupIdx = index('idx_exercises_name_muscle_group').on(exercises.name, exercises.muscleGroup);
export const _exercisesWorkosIdUpdatedAtIdx = index('idx_exercises_workos_id_updated_at').on(exercises.workosId, exercises.updatedAt);
export const _exercisesMuscleGroupIdx = index('idx_exercises_muscle_group').on(exercises.muscleGroup);
export const _exercisesNameIdx = index('idx_exercises_name').on(exercises.name);
export const _exercisesIsDeletedIdx = index('idx_exercises_is_deleted').on(exercises.isDeleted);
export const _exercisesLocalIdIdx = index('idx_exercises_local_id').on(exercises.localId);
export const _exercisesUpdatedAtIdx = index('idx_exercises_updated_at').on(exercises.updatedAt);
export const _exercisesLibraryIdIdx = index('idx_exercises_library_id').on(exercises.libraryId);

export const _templatesWorkosIdIdx = index('idx_templates_workos_id').on(templates.workosId);
export const _templatesWorkosIdUpdatedAtIdx = index('idx_templates_workos_id_updated_at').on(templates.workosId, templates.updatedAt);
export const _templatesIsDeletedIdx = index('idx_templates_is_deleted').on(templates.isDeleted);
export const _templatesLocalIdIdx = index('idx_templates_local_id').on(templates.localId);
export const _templatesUpdatedAtIdx = index('idx_templates_updated_at').on(templates.updatedAt);

export const _workoutsWorkosIdIdx = index('idx_workouts_workos_id').on(workouts.workosId);
export const _workoutsWorkosIdStartedAtIdx = index('idx_workouts_workos_id_started_at').on(workouts.workosId, workouts.startedAt);
export const _workoutsTemplateIdIdx = index('idx_workouts_template_id').on(workouts.templateId);
export const _workoutsStartedAtIdx = index('idx_workouts_started_at').on(workouts.startedAt);
export const _workoutsCompletedAtIdx = index('idx_workouts_completed_at').on(workouts.completedAt);
export const _workoutsLocalIdIdx = index('idx_workouts_local_id').on(workouts.localId);
export const _workoutsIsDeletedIdx = index('idx_workouts_is_deleted').on(workouts.isDeleted);

export const _workoutExercisesWorkoutIdIdx = index('idx_workout_exercises_workout_id').on(workoutExercises.workoutId);
export const _workoutExercisesOrderIdx = index('idx_workout_exercises_order').on(workoutExercises.workoutId, workoutExercises.orderIndex);
export const _workoutExercisesExerciseIdIdx = index('idx_workout_exercises_exercise_id').on(workoutExercises.exerciseId);
export const _workoutExercisesLocalIdIdx = index('idx_workout_exercises_local_id').on(workoutExercises.localId);
export const _workoutExercisesUpdatedAtIdx = index('idx_workout_exercises_updated_at').on(workoutExercises.updatedAt);

export const _workoutSetsWorkoutExerciseIdIdx = index('idx_workout_sets_workout_exercise_id').on(workoutSets.workoutExerciseId);
export const _workoutSetsCompletedAtIdx = index('idx_workout_sets_completed_at').on(workoutSets.completedAt);
export const _workoutSetsLocalIdIdx = index('idx_workout_sets_local_id').on(workoutSets.localId);
export const _workoutSetsUpdatedAtIdx = index('idx_workout_sets_updated_at').on(workoutSets.updatedAt);

export const _userStreaksWorkosIdIdx = index('idx_user_streaks_workos_id').on(userStreaks.workosId);
export const _userStreaksLastWorkoutDateIdx = index('idx_user_streaks_last_workout_date').on(userStreaks.lastWorkoutDate);

export const _userProgramCyclesWorkosIdIdx = index('idx_user_program_cycles_workos_id').on(userProgramCycles.workosId);
export const _userProgramCyclesStatusIdx = index('idx_user_program_cycles_status').on(userProgramCycles.status);
export const _userProgramCyclesUpdatedAtIdx = index('idx_user_program_cycles_updated_at').on(userProgramCycles.updatedAt);

export const _programCycleWorkoutsCycleIdIdx = index('idx_program_cycle_workouts_cycle_id').on(programCycleWorkouts.cycleId);
export const _programCycleWorkoutsCycleIdIsCompleteIdx = index('idx_program_cycle_workouts_cycle_id_is_complete').on(programCycleWorkouts.cycleId, programCycleWorkouts.isComplete);
export const _programCycleWorkoutsTemplateIdIdx = index('idx_program_cycle_workouts_template_id').on(programCycleWorkouts.templateId);
export const _programCycleWorkoutsScheduledDateIdx = index('idx_program_cycle_workouts_scheduled_date').on(programCycleWorkouts.scheduledDate);
export const _programCycleWorkoutsCycleIdScheduledDateIdx = index('idx_program_cycle_workouts_cycle_id_scheduled_date').on(programCycleWorkouts.cycleId, programCycleWorkouts.scheduledDate);

export const _templateExercisesTemplateIdIdx = index('idx_template_exercises_template_id').on(templateExercises.templateId);
export const _templateExercisesOrderIdx = index('idx_template_exercises_order').on(templateExercises.templateId, templateExercises.orderIndex);

// ============================================
// WHOOP INTEGRATION
// ============================================
export const whoopConnections = sqliteTable('whoop_connections', {
  workosId: text('workos_id').primaryKey().references(() => users.workosId, { onDelete: 'cascade' }),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
  tokenExpiresAt: text('token_expires_at').notNull(),
  whoopUserId: text('whoop_user_id').notNull(),
  scopesGranted: text('scopes_granted').notNull(),
  syncStatus: text('sync_status').default('active'),
  syncInProgress: integer('sync_in_progress', { mode: 'boolean' }).default(false),
  syncStartedAt: text('sync_started_at'),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

export const whoopSleeps = sqliteTable('whoop_sleeps', {
  id: text('id').primaryKey(),
  workosId: text('workos_id').notNull().references(() => users.workosId, { onDelete: 'cascade' }),
  sleepDate: text('sleep_date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  timezoneOffset: text('timezone_offset'),
  isNap: integer('is_nap', { mode: 'boolean' }).default(false),
  cycleId: text('cycle_id'),
  qualityScore: real('quality_score'),
  needBase: real('need_base'),
  needStrain: real('need_strain'),
  needDebt: real('need_debt'),
  inBedDurationMs: integer('in_bed_duration_ms'),
  awakeDurationMs: integer('awake_duration_ms'),
  asleepDurationMs: integer('asleep_duration_ms'),
  lightSleepDurationMs: integer('light_sleep_duration_ms'),
  remSleepDurationMs: integer('rem_sleep_duration_ms'),
  slowWaveSleepDurationMs: integer('slow_wave_sleep_duration_ms'),
  disruptions: integer('disruptions'),
  efficiency: real('efficiency'),
  respiratoryRate: real('respiratory_rate'),
  rawJson: text('raw_json'),
  whoopCreatedAt: text('whoop_created_at'),
  whoopUpdatedAt: text('whoop_updated_at'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

export const whoopRecoveries = sqliteTable('whoop_recoveries', {
  id: text('id').primaryKey(),
  workosId: text('workos_id').notNull().references(() => users.workosId, { onDelete: 'cascade' }),
  sleepId: text('sleep_id'),
  cycleId: text('cycle_id'),
  date: text('date').notNull(),
  score: integer('score'),
  status: text('status'),
  restingHeartRate: integer('resting_heart_rate'),
  hrv: real('hrv'),
  spo2: real('spo2'),
  skinTemp: real('skin_temp'),
  cardiovascularLoad: real('cardiovascular_load'),
  musculoskeletalLoad: real('musculoskeletal_load'),
  rawJson: text('raw_json'),
  whoopCreatedAt: text('whoop_created_at'),
  whoopUpdatedAt: text('whoop_updated_at'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

export const whoopCycles = sqliteTable('whoop_cycles', {
  id: text('id').primaryKey(),
  workosId: text('workos_id').notNull().references(() => users.workosId, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  score: integer('score'),
  effort: real('effort'),
  totalStrain: real('total_strain'),
  averageHeartRate: integer('average_heart_rate'),
  maxHeartRate: integer('max_heart_rate'),
  caloriesBurned: integer('calories_burned'),
  distance: real('distance'),
  steps: integer('steps'),
  timeAwakeMs: integer('time_awake_ms'),
  zone1Ms: integer('zone1_ms'),
  zone2Ms: integer('zone2_ms'),
  zone3Ms: integer('zone3_ms'),
  zone4Ms: integer('zone4_ms'),
  zone5Ms: integer('zone5_ms'),
  rawJson: text('raw_json'),
  whoopCreatedAt: text('whoop_created_at'),
  whoopUpdatedAt: text('whoop_updated_at'),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

export const whoopWorkouts = sqliteTable('whoop_workouts', {
  id: text('id').primaryKey(),
  workosId: text('workos_id').notNull().references(() => users.workosId, { onDelete: 'cascade' }),
  name: text('name'),
  sportId: integer('sport_id'),
  sportName: text('sport_name'),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  durationMs: integer('duration_ms'),
  strain: real('strain'),
  averageHeartRate: integer('average_heart_rate'),
  maxHeartRate: integer('max_heart_rate'),
  calories: integer('calories'),
  distance: real('distance'),
  zone1Ms: integer('zone1_ms'),
  zone2Ms: integer('zone2_ms'),
  zone3Ms: integer('zone3_ms'),
  zone4Ms: integer('zone4_ms'),
  zone5Ms: integer('zone5_ms'),
  rawJson: text('raw_json'),
  whoopCreatedAt: text('whoop_created_at'),
  whoopUpdatedAt: text('whoop_updated_at'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').$defaultFn(() => nowISO()),
  updatedAt: text('updated_at').$defaultFn(() => nowISO()),
});

export const whoopWebhookEvents = sqliteTable('whoop_webhook_events', {
  id: text('id').primaryKey(),
  workosId: text('workos_id'),
  traceId: text('trace_id'),
  eventType: text('event_type').notNull(),
  payloadRaw: text('payload_raw'),
  receivedAt: text('received_at').$defaultFn(() => nowISO()),
  processedAt: text('processed_at'),
  processingError: text('processing_error'),
});

export const _whoopSleepsWorkosDateIdx = index('idx_whoop_sleeps_workos_date').on(whoopSleeps.workosId, whoopSleeps.sleepDate);
export const _whoopSleepsWorkosStartIdx = index('idx_whoop_sleeps_workos_start').on(whoopSleeps.workosId, whoopSleeps.startTime);
export const _whoopRecoveriesWorkosDateIdx = index('idx_whoop_recoveries_workos_date').on(whoopRecoveries.workosId, whoopRecoveries.date);
export const _whoopCyclesWorkosDateIdx = index('idx_whoop_cycles_workos_date').on(whoopCycles.workosId, whoopCycles.date);
export const _whoopCyclesWorkosStartIdx = index('idx_whoop_cycles_workos_start').on(whoopCycles.workosId, whoopCycles.startTime);
export const _whoopWorkoutsWorkosStartIdx = index('idx_whoop_workouts_workos_start').on(whoopWorkouts.workosId, whoopWorkouts.startTime);
export const _whoopWebhookEventsTypeIdx = index('idx_whoop_webhook_events_type').on(whoopWebhookEvents.eventType);

// ============================================
// TYPE EXPORTS
// ============================================
export type User = typeof users.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type TemplateExercise = typeof templateExercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type UserStreak = typeof userStreaks.$inferSelect;
export type UserProgramCycle = typeof userProgramCycles.$inferSelect;
export type ProgramCycleWorkout = typeof programCycleWorkouts.$inferSelect;
export type WhoopConnection = typeof whoopConnections.$inferSelect;
export type WhoopSleep = typeof whoopSleeps.$inferSelect;
export type WhoopRecovery = typeof whoopRecoveries.$inferSelect;
export type WhoopCycle = typeof whoopCycles.$inferSelect;
export type WhoopWorkout = typeof whoopWorkouts.$inferSelect;
export type WhoopWebhookEvent = typeof whoopWebhookEvents.$inferSelect;

export type NewUser = typeof users.$inferInsert;
export type NewExercise = typeof exercises.$inferInsert;
export type NewTemplate = typeof templates.$inferInsert;
export type NewTemplateExercise = typeof templateExercises.$inferInsert;
export type NewWorkout = typeof workouts.$inferInsert;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type NewUserStreak = typeof userStreaks.$inferInsert;
export type NewUserProgramCycle = typeof userProgramCycles.$inferInsert;
export type NewProgramCycleWorkout = typeof programCycleWorkouts.$inferInsert;
export type NewWhoopConnection = typeof whoopConnections.$inferInsert;
export type NewWhoopSleep = typeof whoopSleeps.$inferInsert;
export type NewWhoopRecovery = typeof whoopRecoveries.$inferInsert;
export type NewWhoopCycle = typeof whoopCycles.$inferInsert;
export type NewWhoopWorkout = typeof whoopWorkouts.$inferInsert;
export type NewWhoopWebhookEvent = typeof whoopWebhookEvents.$inferInsert;

export default {
  generateId,
  users,
  userPreferences,
  exercises,
  templates,
  templateExercises,
  workouts,
  workoutExercises,
  workoutSets,
  userStreaks,
  userProgramCycles,
  programCycleWorkouts,
  whoopConnections,
  whoopSleeps,
  whoopRecoveries,
  whoopCycles,
  whoopWorkouts,
  whoopWebhookEvents,
};
