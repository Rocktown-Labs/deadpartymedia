import { vi } from "vite-plus/test";

/**
 * Mock database module
 */
export const mockDb = () => {
  const mockDbInstance = {
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };

  vi.mock("@/lib/db", () => ({
    db: mockDbInstance,
  }));

  return mockDbInstance;
};

/**
 * Helper to create a mock database query result
 */
export const createMockQueryResult = <T>(data: T[]) => Promise.resolve(data);

/**
 * Helper to create a mock database insert result
 */
export const createMockInsertResult = <T>(data: T[]) => Promise.resolve(data);
