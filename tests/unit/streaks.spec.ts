import { describe, it, expect, vi } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import { calculateThirtyDayStreak, countWorkoutsInRange, getWeeklyWorkoutCount, getTotalWorkouts } from '~/lib/streaks'
import { createDb } from '~/lib/db'

vi.mock('~/lib/db', () => ({
  createDb: vi.fn(),
}))

const mockDrizzleDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
}

describe('Streak Calculations', () => {
  it('returns 0 weeks for user with no workouts', async () => {
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as unknown as ReturnType<typeof createDb>)

    const result = await calculateThirtyDayStreak({} as D1Database, 'test-user')
    expect(result.current).toBe(0)
    expect(result.progress).toBe(0)
  })

  it('calculates 30-day streak correctly with 4 consecutive weeks', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { count: 4 },
          ]),
        }),
      }),
    }
    vi.mocked(createDb).mockReturnValue(mockDb as unknown as ReturnType<typeof createDb>)

    const result = await calculateThirtyDayStreak({} as D1Database, 'test-user', 3, 8)
    expect(result.current).toBe(8)
    expect(result.maxConsecutive).toBe(8)
    expect(result.progress).toBe(100)
    expect(result.weeklyDetails[0].count).toBe(4)
    expect(result.weeklyDetails.every(w => w.meetsTarget)).toBe(true)
  })

  it('counts workouts correctly in a date range', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { count: 5 },
          ]),
        }),
      }),
    }
    vi.mocked(createDb).mockReturnValue(mockDb as unknown as ReturnType<typeof createDb>)

    const count = await countWorkoutsInRange({} as D1Database, 'test-user', '2024-01-01', '2024-01-07')
    expect(count).toBe(5)
  })

  it('calculates weekly workout count correctly', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { count: 3 },
          ]),
        }),
      }),
    }
    vi.mocked(createDb).mockReturnValue(mockDb as unknown as ReturnType<typeof createDb>)

    const count = await getWeeklyWorkoutCount({} as D1Database, 'test-user')
    expect(count).toBe(3)
  })

  it('calculates total workouts correctly', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 42 }]),
        }),
      }),
    }
    vi.mocked(createDb).mockReturnValue(mockDb as unknown as ReturnType<typeof createDb>)

    const total = await getTotalWorkouts({} as D1Database, 'test-user')
    expect(total).toBe(42)
  })
})
