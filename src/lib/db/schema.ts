import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================
// CORE ENTITIES
// ============================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  workosId: text('workos_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userPreferences = sqliteTable('user_preferences', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  workosId: text('workos_id').primaryKey().references(() => users.workosId, { onDelete: 'cascade' }),
  weightUnit: text('weight_unit').default('kg'),
  dateFormat: text('date_format').default('dd/mm/yyyy'),
  theme: text('theme').default('light'),
  weeklyWorkoutTarget: integer('weekly_workout_target').default(3),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
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
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
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
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
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
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
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
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
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
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
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
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
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
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
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
};
