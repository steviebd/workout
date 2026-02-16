/**
 * Shared Utility Types
 *
 * Common utility types used across the application.
 */

import type { z } from 'zod';

// ============================================
// INFERENCE HELPERS
// ============================================

/** Infer the input type from a Zod schema */
export type ZodInput<T extends z.ZodType> = z.infer<T>;

/** Infer the output type from a Zod schema */
export type ZodOutput<T extends z.ZodType> = z.output<T>;

// ============================================
// RECORD HELPERS
// ============================================

/** Type-safe partial record */
export type PartialRecord<K extends string, T> = Partial<Record<K, T>>;

/** Type-safe required record */
export type RequiredRecord<K extends string, T> = Required<Record<K, T>>;

// ============================================
// FUNCTION HELPERS
// ============================================

/** Type for async functions that return void */
export type AsyncVoidFn = () => Promise<void>;

/** Type for async functions that return a value */
export type AsyncFn<T> = () => Promise<T>;

/** Type for functions that may or may not be async */
export type MaybeAsyncFn<TArgs, TResult> = 
  | ((args: TArgs) => Promise<TResult>)
  | ((args: TArgs) => TResult);

// ============================================
// ARRAY HELPERS
// ============================================

/** Non-empty array type - use with 'as const' for tuples */
export type NonEmptyArray<T> = [T, ...T[]];

// ============================================
// STRING HELPERS
// ============================================

/** Template literal for snake_case */
export type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${SnakeCase<U>}`
  : S;

/** Template literal for camelCase */
export type CamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<CamelCase<U>>}`
  : S;

// ============================================
// DATE/TIME HELPERS
// ============================================

/** ISO date string */
export type ISO8601Date = string;

/** ISO datetime string */
export type ISO8601DateTime = string;

/** Unix timestamp in milliseconds */
export type UnixTimestampMs = number;

/** Unix timestamp in seconds */
export type UnixTimestamp = number;

// ============================================
// RESULT TYPES
// ============================================

/** Error-first result pattern */
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Create a success result */
export function success<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

/** Create an error result */
export function fail<E = Error>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

// ============================================
// PROMISE HELPERS
// ============================================

/** Awaited type with optional unwrapping */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** Promise that resolves to void */
export type PromiseVoid = Promise<void>;
