import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export function generateId(): string {
  return crypto.randomUUID();
}

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  workosId: text('workos_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userPreferences = sqliteTable('user_preferences', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  weightUnit: text('weight_unit').default('kg'),
  dateFormat: text('date_format').default('dd/mm/yyyy'),
  theme: text('theme').default('light'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  muscleGroup: text('muscle_group'),
  description: text('description'),
  libraryId: text('library_id'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  notes: text('notes'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const templateExercises = sqliteTable('template_exercises', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  templateId: text('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
});

export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  templateId: text('template_id').references(() => templates.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const workoutExercises = sqliteTable('workout_exercises', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id'),
  workoutId: text('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  notes: text('notes'),
});

export const workoutSets = sqliteTable('workout_sets', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  localId: text('local_id'),
  workoutExerciseId: text('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  weight: real('weight'),
  reps: integer('reps'),
  rpe: real('rpe'),
  isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const _exercisesUserIdIdx = index('idx_exercises_user_id').on(exercises.userId);
export const _exercisesMuscleGroupIdx = index('idx_exercises_muscle_group').on(exercises.muscleGroup);
export const _exercisesNameIdx = index('idx_exercises_name').on(exercises.name);
export const _exercisesIsDeletedIdx = index('idx_exercises_is_deleted').on(exercises.isDeleted);
export const _exercisesLocalIdIdx = index('idx_exercises_local_id').on(exercises.localId);
export const _exercisesUpdatedAtIdx = index('idx_exercises_updated_at').on(exercises.updatedAt);
export const _exercisesLibraryIdIdx = index('idx_exercises_library_id').on(exercises.libraryId);

export const _templatesUserIdIdx = index('idx_templates_user_id').on(templates.userId);
export const _templatesIsDeletedIdx = index('idx_templates_is_deleted').on(templates.isDeleted);
export const _templatesLocalIdIdx = index('idx_templates_local_id').on(templates.localId);
export const _templatesUpdatedAtIdx = index('idx_templates_updated_at').on(templates.updatedAt);

export const _workoutsUserIdIdx = index('idx_workouts_user_id').on(workouts.userId);
export const _workoutsTemplateIdIdx = index('idx_workouts_template_id').on(workouts.templateId);
export const _workoutsStartedAtIdx = index('idx_workouts_started_at').on(workouts.startedAt);
export const _workoutsCompletedAtIdx = index('idx_workouts_completed_at').on(workouts.completedAt);
export const _workoutsLocalIdIdx = index('idx_workouts_local_id').on(workouts.localId);

export const _workoutExercisesWorkoutIdIdx = index('idx_workout_exercises_workout_id').on(workoutExercises.workoutId);
export const _workoutExercisesExerciseIdIdx = index('idx_workout_exercises_exercise_id').on(workoutExercises.exerciseId);
export const _workoutExercisesLocalIdIdx = index('idx_workout_exercises_local_id').on(workoutExercises.localId);

export const _workoutSetsWorkoutExerciseIdIdx = index('idx_workout_sets_workout_exercise_id').on(workoutSets.workoutExerciseId);
export const _workoutSetsCompletedAtIdx = index('idx_workout_sets_completed_at').on(workoutSets.completedAt);
export const _workoutSetsLocalIdIdx = index('idx_workout_sets_local_id').on(workoutSets.localId);

export type User = typeof users.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type TemplateExercise = typeof templateExercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;

export type NewUser = typeof users.$inferInsert;
export type NewExercise = typeof exercises.$inferInsert;
export type NewTemplate = typeof templates.$inferInsert;
export type NewTemplateExercise = typeof templateExercises.$inferInsert;
export type NewWorkout = typeof workouts.$inferInsert;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
export type NewUserPreference = typeof userPreferences.$inferInsert;

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
};
