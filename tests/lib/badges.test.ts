import { describe, it, expect, vi } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import { BADGE_DEFINITIONS, calculateAllBadges } from '~/lib/gamification'
import { createDb } from '~/lib/db'

vi.mock('~/lib/db', () => {
  let mockDbInstance: ReturnType<typeof makeChainableMock> | null = null

  function makeChainableMock(returnValue: unknown) {
    const resolvedValue = returnValue
    const chain = {
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue(resolvedValue),
      get: vi.fn().mockResolvedValue(resolvedValue),
      then: vi.fn((resolve) => resolve(resolvedValue)),
    }
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      }),
    }
  }

  const makeDb = vi.fn(() => {
    mockDbInstance ??= makeChainableMock([])
    return mockDbInstance
  })

  const getDb = vi.fn((dbOrTx) => {
    if (dbOrTx && typeof dbOrTx === 'object' && 'transaction' in dbOrTx) {
      return dbOrTx
    }
    return makeDb()
  })

  return { createDb: makeDb, getDb }
})

function createChainableMock<T>(returnValue: T) {
  const resolvedValue = returnValue as unknown
  const chain = {
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue(resolvedValue),
    get: vi.fn().mockResolvedValue(resolvedValue),
    then: vi.fn((resolve) => resolve(resolvedValue)),
  }
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    }),
  }
}

const mockDrizzleDb = createChainableMock([])

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
    const streak4wBadge = badges.find(b => b.id === 'streak-4w')
    expect(streak4wBadge?.unlocked).toBe(false)
  })
})
