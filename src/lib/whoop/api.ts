import { whoopRepository } from './repository';
import { decryptToken, encryptToken } from './crypto';
import {
  whoopTokenResponseSchema,
  whoopSleepsResponseSchema,
  whoopRecoveriesResponseSchema,
  whoopCyclesResponseSchema,
  whoopWorkoutsResponseSchema,
  type WhoopUser,
  type WhoopSleep,
  type WhoopRecovery,
  type WhoopCycle,
  type WhoopWorkout,
} from './types';

const WHOOP_API_URL = process.env.WHOOP_API_URL ?? 'https://api.prod.whoop.com';
const WHOOP_REDIRECT_URI =
  process.env.WHOOP_REDIRECT_URI ?? 'http://localhost:8787/api/integrations/whoop/callback';
const TOKEN_REFRESH_THRESHOLD_MINUTES = 5;

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class WhoopApiClient {
  constructor(
    private workosId: string,
    private db: D1Database
  ) {}

  private async getDecryptedTokens(): Promise<TokenData> {
    const connection = await whoopRepository.getConnection(this.db, this.workosId);
    if (!connection) {
      throw new Error('Whoop connection not found');
    }

    const accessToken = await decryptToken(connection.accessTokenEncrypted);
    const refreshToken = await decryptToken(connection.refreshTokenEncrypted);

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(connection.tokenExpiresAt),
    };
  }

  private async refreshTokensIfNeeded(tokens: TokenData): Promise<TokenData> {
    const now = new Date();
    const threshold = new Date(now.getTime() + TOKEN_REFRESH_THRESHOLD_MINUTES * 60 * 1000);

    if (tokens.expiresAt <= threshold) {
      return this.refreshAccessToken(tokens.refreshToken);
    }

    return tokens;
  }

  private async refreshAccessToken(refreshToken: string): Promise<TokenData> {
    const clientId = process.env.WHOOP_CLIENT_ID ?? '';
    const clientSecret = process.env.WHOOP_CLIENT_SECRET ?? '';

    if (!clientId || !clientSecret) {
      throw new Error('Whoop OAuth misconfigured: missing WHOOP_CLIENT_ID or WHOOP_CLIENT_SECRET');
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: WHOOP_REDIRECT_URI,
    });

    const response = await fetch(`${WHOOP_API_URL}/oauth/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Whoop token refresh failed (${response.status}):`, errorText);
      if (response.status === 401) {
        await whoopRepository.markConnectionRevoked(this.db, this.workosId);
        throw new Error('Whoop refresh token invalid - connection revoked');
      }
      throw new Error(`Whoop token refresh failed: ${response.status}: ${errorText}`);
    }

    const data = whoopTokenResponseSchema.parse(await response.json());

    const encryptedAccess = await encryptToken(data.access_token);
    const encryptedRefresh = await encryptToken(data.refresh_token);
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await whoopRepository.updateTokens(
      this.db,
      this.workosId,
      encryptedAccess,
      encryptedRefresh,
      expiresAt.toISOString()
    );

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  private async markConnectionRevoked(): Promise<void> {
    await whoopRepository.markConnectionRevoked(this.db, this.workosId);
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let tokens = await this.getDecryptedTokens();
    tokens = await this.refreshTokensIfNeeded(tokens);

    const url = `${WHOOP_API_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      await this.markConnectionRevoked();
      throw new Error('Whoop access token invalid - connection revoked');
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000;
      await new Promise((resolve) => {
        setTimeout(resolve, waitTime);
      });
      return this.fetchWithAuth(endpoint, options);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whoop API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async getUser(): Promise<WhoopUser> {
    return this.fetchWithAuth<WhoopUser>('/developer/v2/user/profile/basic');
  }

  async getCycles(
    startDate: string,
    endDate: string
  ): Promise<{ nextToken: string | null; records: WhoopCycle[] }> {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
    });

    const response = whoopCyclesResponseSchema.parse(
      await this.fetchWithAuth(`/developer/v2/cycle?${params}`)
    );

    return {
      nextToken: response.next_token ?? null,
      records: response.records,
    };
  }

  async getSleeps(
    startDate: string,
    endDate: string
  ): Promise<{ nextToken: string | null; records: WhoopSleep[] }> {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
    });

    const response = whoopSleepsResponseSchema.parse(
      await this.fetchWithAuth(`/developer/v2/activity/sleep?${params}`)
    );

    return {
      nextToken: response.next_token ?? null,
      records: response.records,
    };
  }

  async getRecoveries(
    startDate: string,
    endDate: string
  ): Promise<{ nextToken: string | null; records: WhoopRecovery[] }> {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
    });

    const response = whoopRecoveriesResponseSchema.parse(
      await this.fetchWithAuth(`/developer/v2/recovery?${params}`)
    );

    return {
      nextToken: response.next_token ?? null,
      records: response.records,
    };
  }

  async getWorkouts(
    startDate: string,
    endDate: string
  ): Promise<{ nextToken: string | null; records: WhoopWorkout[] }> {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
    });

    const response = whoopWorkoutsResponseSchema.parse(
      await this.fetchWithAuth(`/developer/v2/activity/workout?${params}`)
    );

    return {
      nextToken: response.next_token ?? null,
      records: response.records,
    };
  }
}

export function mapWhoopSleepToDb(sleep: WhoopSleep, workosId?: string) {
  const score = sleep.score;
  return {
    id: sleep.id,
    sleepDate: sleep.start.split('T')[0],
    startTime: sleep.start,
    endTime: sleep.end,
    timezoneOffset: sleep.timezone_offset ?? null,
    isNap: sleep.nap,
    cycleId: null,
    qualityScore: score?.sleep_performance_percentage ?? null,
    needBase: score?.sleep_needed?.baseline_milli ?? null,
    needStrain: score?.sleep_needed?.need_from_recent_strain_milli ?? null,
    needDebt: score?.sleep_needed?.need_from_sleep_debt_milli ?? null,
    inBedDurationMs: score?.stage_summary?.total_in_bed_time_milli ?? null,
    awakeDurationMs: score?.stage_summary?.total_awake_time_milli ?? null,
    asleepDurationMs: score?.stage_summary
      ? score.stage_summary.total_in_bed_time_milli - score.stage_summary.total_awake_time_milli
      : null,
    lightSleepDurationMs: score?.stage_summary?.total_light_sleep_time_milli ?? null,
    remSleepDurationMs: score?.stage_summary?.total_rem_sleep_time_milli ?? null,
    slowWaveSleepDurationMs: score?.stage_summary?.total_slow_wave_sleep_time_milli ?? null,
    disruptions: score?.stage_summary?.disturbance_count ?? null,
    efficiency: score?.sleep_efficiency_percentage ?? null,
    respiratoryRate: score?.respiratory_rate ?? null,
    rawJson: JSON.stringify(sleep),
    whoopCreatedAt: sleep.created_at,
    whoopUpdatedAt: sleep.updated_at,
    workosId: workosId ?? '',
  };
}

export function mapWhoopRecoveryToDb(recovery: WhoopRecovery, workosId?: string) {
  const score = recovery.score;
  return {
    id: recovery.cycle_id.toString(),
    cycleId: recovery.cycle_id.toString(),
    date: recovery.created_at.split('T')[0],
    score: score?.recovery_score ?? null,
    status: null,
    restingHeartRate: score?.resting_heart_rate ?? null,
    hrv: score?.hrv_rmssd_milli ?? null,
    spo2: score?.spo2_percentage ?? null,
    skinTemp: score?.skin_temp_celsius ?? null,
    cardiovascularLoad: null,
    musculoskeletalLoad: null,
    rawJson: JSON.stringify(recovery),
    whoopCreatedAt: recovery.created_at,
    whoopUpdatedAt: recovery.updated_at,
    workosId: workosId ?? '',
  };
}

export function mapWhoopCycleToDb(cycle: WhoopCycle, workosId?: string) {
  const score = cycle.score;
  return {
    id: cycle.id.toString(),
    date: cycle.start.split('T')[0],
    startTime: cycle.start,
    endTime: cycle.end ?? cycle.start,
    score: null,
    effort: null,
    totalStrain: score?.strain ?? null,
    averageHeartRate: score?.average_heart_rate ?? null,
    maxHeartRate: score?.max_heart_rate ?? null,
    caloriesBurned: score?.kilojoule !== null ? Math.round((score?.kilojoule ?? 0) / 4.184) : null,
    distance: null,
    steps: null,
    timeAwakeMs: null,
    zone1Ms: null,
    zone2Ms: null,
    zone3Ms: null,
    zone4Ms: null,
    zone5Ms: null,
    rawJson: JSON.stringify(cycle),
    whoopCreatedAt: cycle.created_at,
    whoopUpdatedAt: cycle.updated_at,
    workosId: workosId ?? '',
  };
}

export function mapWhoopWorkoutToDb(workout: WhoopWorkout, workosId?: string) {
  const score = workout.score;
  const startMs = new Date(workout.start).getTime();
  const endMs = new Date(workout.end).getTime();
  return {
    id: workout.id,
    name: workout.sport_name ?? null,
    sportId: workout.sport_id,
    sportName: workout.sport_name ?? null,
    startTime: workout.start,
    endTime: workout.end,
    durationMs: endMs - startMs > 0 ? endMs - startMs : null,
    strain: score?.strain ?? null,
    averageHeartRate: score?.average_heart_rate ?? null,
    maxHeartRate: score?.max_heart_rate ?? null,
    calories: score?.kilojoule !== null ? Math.round((score?.kilojoule ?? 0) / 4.184) : null,
    distance: score?.distance_meter ?? null,
    zone1Ms: score?.zone_durations?.zone_one_milli ?? null,
    zone2Ms: score?.zone_durations?.zone_two_milli ?? null,
    zone3Ms: score?.zone_durations?.zone_three_milli ?? null,
    zone4Ms: score?.zone_durations?.zone_four_milli ?? null,
    zone5Ms: score?.zone_durations?.zone_five_milli ?? null,
    rawJson: JSON.stringify(workout),
    whoopCreatedAt: workout.created_at,
    whoopUpdatedAt: workout.updated_at,
    workosId: workosId ?? '',
  };
}
