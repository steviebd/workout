import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

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

export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  muscleGroup: text('muscle_group'),
  description: text('description'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  notes: text('notes'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const templateExercises = sqliteTable('template_exercises', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  templateId: text('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
});

export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
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
  workoutId: text('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  notes: text('notes'),
});

export const workoutSets = sqliteTable('workout_sets', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  workoutExerciseId: text('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  weight: real('weight'),
  reps: integer('reps'),
  rpe: real('rpe'),
  isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type TemplateExercise = typeof templateExercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;

export type NewUser = typeof users.$inferInsert;
export type NewExercise = typeof exercises.$inferInsert;
export type NewTemplate = typeof templates.$inferInsert;
export type NewTemplateExercise = typeof templateExercises.$inferInsert;
export type NewWorkout = typeof workouts.$inferInsert;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
