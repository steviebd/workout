import { z } from 'zod';

// ── Token ───────────────────────────────────────────────────────────────────

export const whoopTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.literal('Bearer'),
  scope: z.string().optional(),
});

export type WhoopTokenResponse = z.infer<typeof whoopTokenResponseSchema>;

// ── User Profile ────────────────────────────────────────────────────────────

export const whoopUserSchema = z.object({
  user_id: z.number(),
  email: z.string().optional(),
  first_name: z.string(),
  last_name: z.string(),
});

export type WhoopUser = z.infer<typeof whoopUserSchema>;

// ── Recovery ────────────────────────────────────────────────────────────────

export const whoopRecoveryScoreSchema = z.object({
  user_calibrating: z.boolean(),
  recovery_score: z.number(),
  resting_heart_rate: z.number(),
  hrv_rmssd_milli: z.number(),
  spo2_percentage: z.number().optional().nullable(),
  skin_temp_celsius: z.number().optional().nullable(),
});

export const whoopRecoverySchema = z.object({
  cycle_id: z.number(),
  sleep_id: z.string(),
  user_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  score_state: z.enum(['SCORED', 'PENDING_SCORE', 'UNSCORABLE']),
  score: whoopRecoveryScoreSchema.optional().nullable(),
});

export type WhoopRecoveryScore = z.infer<typeof whoopRecoveryScoreSchema>;
export type WhoopRecovery = z.infer<typeof whoopRecoverySchema>;

// ── Sleep ───────────────────────────────────────────────────────────────────

export const whoopSleepStageSummarySchema = z.object({
  total_in_bed_time_milli: z.number(),
  total_awake_time_milli: z.number(),
  total_no_data_time_milli: z.number(),
  total_light_sleep_time_milli: z.number(),
  total_slow_wave_sleep_time_milli: z.number(),
  total_rem_sleep_time_milli: z.number(),
  sleep_cycle_count: z.number(),
  disturbance_count: z.number(),
});

export const whoopSleepNeededSchema = z.object({
  baseline_milli: z.number(),
  need_from_sleep_debt_milli: z.number(),
  need_from_recent_strain_milli: z.number(),
  need_from_recent_nap_milli: z.number(),
});

export const whoopSleepScoreSchema = z.object({
  stage_summary: whoopSleepStageSummarySchema,
  sleep_needed: whoopSleepNeededSchema,
  respiratory_rate: z.number().optional().nullable(),
  sleep_performance_percentage: z.number().optional().nullable(),
  sleep_consistency_percentage: z.number().optional().nullable(),
  sleep_efficiency_percentage: z.number().optional().nullable(),
});

export const whoopSleepSchema = z.object({
  id: z.string(),
  user_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  start: z.string(),
  end: z.string(),
  timezone_offset: z.string().optional().nullable(),
  nap: z.boolean(),
  score_state: z.enum(['SCORED', 'PENDING_SCORE', 'UNSCORABLE']),
  score: whoopSleepScoreSchema.optional().nullable(),
});

export type WhoopSleepStageSummary = z.infer<typeof whoopSleepStageSummarySchema>;
export type WhoopSleepNeeded = z.infer<typeof whoopSleepNeededSchema>;
export type WhoopSleepScore = z.infer<typeof whoopSleepScoreSchema>;
export type WhoopSleep = z.infer<typeof whoopSleepSchema>;

// ── Cycle ───────────────────────────────────────────────────────────────────

export const whoopCycleScoreSchema = z.object({
  strain: z.number(),
  kilojoule: z.number(),
  average_heart_rate: z.number(),
  max_heart_rate: z.number(),
});

export const whoopCycleSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  start: z.string(),
  end: z.string().optional().nullable(),
  timezone_offset: z.string().optional().nullable(),
  score_state: z.enum(['SCORED', 'PENDING_SCORE', 'UNSCORABLE']),
  score: whoopCycleScoreSchema.optional().nullable(),
});

export type WhoopCycleScore = z.infer<typeof whoopCycleScoreSchema>;
export type WhoopCycle = z.infer<typeof whoopCycleSchema>;

// ── Workout ─────────────────────────────────────────────────────────────────

export const whoopWorkoutZoneDurationsSchema = z.object({
  zone_zero_milli: z.number().optional().nullable(),
  zone_one_milli: z.number().optional().nullable(),
  zone_two_milli: z.number().optional().nullable(),
  zone_three_milli: z.number().optional().nullable(),
  zone_four_milli: z.number().optional().nullable(),
  zone_five_milli: z.number().optional().nullable(),
});

export const whoopWorkoutScoreSchema = z.object({
  strain: z.number(),
  average_heart_rate: z.number(),
  max_heart_rate: z.number(),
  kilojoule: z.number(),
  percent_recorded: z.number().optional().nullable(),
  distance_meter: z.number().optional().nullable(),
  altitude_gain_meter: z.number().optional().nullable(),
  altitude_change_meter: z.number().optional().nullable(),
  zone_durations: whoopWorkoutZoneDurationsSchema.optional().nullable(),
});

export const whoopWorkoutSchema = z.object({
  id: z.string(),
  v1_id: z.number().optional().nullable(),
  user_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  start: z.string(),
  end: z.string(),
  timezone_offset: z.string().optional().nullable(),
  sport_name: z.string().optional().nullable(),
  score_state: z.enum(['SCORED', 'PENDING_SCORE', 'UNSCORABLE']),
  score: whoopWorkoutScoreSchema.optional().nullable(),
  sport_id: z.number(),
});

export type WhoopWorkoutZoneDurations = z.infer<typeof whoopWorkoutZoneDurationsSchema>;
export type WhoopWorkoutScore = z.infer<typeof whoopWorkoutScoreSchema>;
export type WhoopWorkout = z.infer<typeof whoopWorkoutSchema>;

// ── Paginated Response ──────────────────────────────────────────────────────

export const whoopPaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    next_token: z.string().nullable(),
    records: z.array(itemSchema),
  });

export interface WhoopPaginatedResponse<T> {
  next_token: string | null;
  records: T[];
}

export const whoopSleepsResponseSchema = whoopPaginatedResponseSchema(whoopSleepSchema);
export const whoopRecoveriesResponseSchema = whoopPaginatedResponseSchema(whoopRecoverySchema);
export const whoopCyclesResponseSchema = whoopPaginatedResponseSchema(whoopCycleSchema);
export const whoopWorkoutsResponseSchema = whoopPaginatedResponseSchema(whoopWorkoutSchema);

export type WhoopSleepsResponse = z.infer<typeof whoopSleepsResponseSchema>;
export type WhoopRecoveriesResponse = z.infer<typeof whoopRecoveriesResponseSchema>;
export type WhoopCyclesResponse = z.infer<typeof whoopCyclesResponseSchema>;
export type WhoopWorkoutsResponse = z.infer<typeof whoopWorkoutsResponseSchema>;
