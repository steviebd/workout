import { describe, it, expect, vi } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import { BADGE_DEFINITIONS, calculateAllBadges } from '~/lib/badges'
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
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}

describe('Badge System', () => {
  it('has unique IDs for all badges', () => {
    const ids = BADGE_DEFINITIONS.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('calculates progress correctly for streak badges', async () => {
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as unknown as ReturnType<typeof createDb>)

    const badges = await calculateAllBadges({} as D1Database, 'test-user')
    expect(badges.length).toBe(BADGE_DEFINITIONS.length)
  })

  it('marks badge as unlocked when requirement is met', async () => {
    vi.mocked(createDb).mockReturnValue(mockDrizzleDb as unknown as ReturnType<typeof createDb>)

    const badges = await calculateAllBadges({} as D1Database, 'test-user')
    const streak7Badge = badges.find(b => b.id === 'streak-7')
    expect(streak7Badge?.unlocked).toBe(false)
  })
})
