import { describe, it, expect, vi } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import { calculateCurrentStreak, calculateLongestStreak } from '~/lib/streaks'
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
  it('returns 0 for user with no workouts', async () => {
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as unknown as ReturnType<typeof createDb>)

    const streak = await calculateCurrentStreak({} as D1Database, 'test-user')
    expect(streak).toBe(0)
  })

  it('calculates current streak correctly with consecutive days', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { completedAt: '2024-01-01T10:00:00.000Z' },
            { completedAt: '2024-01-02T10:00:00.000Z' },
            { completedAt: '2024-01-03T10:00:00.000Z' },
          ]),
        }),
      }),
    }
    vi.mocked(createDb).mockReturnValue(mockDb as unknown as ReturnType<typeof createDb>)

    const streak = await calculateCurrentStreak({} as D1Database, 'test-user')
    expect(streak).toBe(3)
  })

  it('breaks streak when gap exceeds 1 day', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { completedAt: '2024-01-01T10:00:00.000Z' },
            { completedAt: '2024-01-02T10:00:00.000Z' },
            { completedAt: '2024-01-05T10:00:00.000Z' },
          ]),
        }),
      }),
    }
    vi.mocked(createDb).mockReturnValue(mockDb as unknown as ReturnType<typeof createDb>)

    const streak = await calculateCurrentStreak({} as D1Database, 'test-user')
    expect(streak).toBe(1)
  })

  it('calculates longest streak correctly', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { completedAt: '2024-01-01T10:00:00.000Z' },
            { completedAt: '2024-01-02T10:00:00.000Z' },
            { completedAt: '2024-01-03T10:00:00.000Z' },
            { completedAt: '2024-01-10T10:00:00.000Z' },
            { completedAt: '2024-01-11T10:00:00.000Z' },
          ]),
        }),
      }),
    }
    vi.mocked(createDb).mockReturnValue(mockDb as unknown as ReturnType<typeof createDb>)

    const streak = await calculateLongestStreak({} as D1Database, 'test-user')
    expect(streak).toBe(3)
  })
})
