import { vi } from 'vitest'
import type { artists, posts, events } from '@/lib/db/schema'

/**
 * Mock database module
 */
export const mockDb = () => {
  const mockDbInstance = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  }

  vi.mock('@/lib/db', () => ({
    db: mockDbInstance,
  }))

  return mockDbInstance
}

/**
 * Helper to create a mock database query result
 */
export const createMockQueryResult = <T>(data: T[]) => {
  return Promise.resolve(data)
}

/**
 * Helper to create a mock database insert result
 */
export const createMockInsertResult = <T>(data: T[]) => {
  return Promise.resolve(data)
}
