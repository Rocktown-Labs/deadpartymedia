import { vi } from "vite-plus/test";
import type { artists, posts, events } from "@/lib/db/schema";

export const createMockDb = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockFrom = vi.fn().mockReturnThis();
  const mockWhere = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockValues = vi.fn().mockReturnThis();
  const mockSet = vi.fn().mockReturnThis();
  const mockReturning = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockOrderBy = vi.fn().mockReturnThis();
  const mockOffset = vi.fn().mockReturnThis();

  return {
    delete: mockDelete,
    from: mockFrom,
    insert: mockInsert,
    limit: mockLimit,
    offset: mockOffset,
    orderBy: mockOrderBy,
    returning: mockReturning,
    select: mockSelect,
    set: mockSet,
    update: mockUpdate,
    values: mockValues,
    where: mockWhere,
  };
};

export const createMockArtist = (overrides?: Partial<typeof artists.$inferSelect>) => ({
  bio: "Test bio",
  claimed: false,
  claimedById: null,
  createdAt: new Date(),
  genre: "EDM" as const,
  id: 1,
  location: "Test Location",
  name: "Test Artist",
  profileViews: 0,
  slug: "test-artist",
  updatedAt: new Date(),
  ...overrides,
});

export const createMockPost = (overrides?: Partial<typeof posts.$inferSelect>) => ({
  authorId: "user_test123",
  category: "EDM" as const,
  content: "{}",
  createdAt: new Date(),
  excerpt: "Test excerpt",
  id: 1,
  isCoverStory: false,
  publishedAt: new Date(),
  slug: "test-post",
  status: "published" as const,
  title: "Test Post",
  updatedAt: new Date(),
  views: 0,
  ...overrides,
});

export const createMockEvent = (overrides?: Partial<typeof events.$inferSelect>) => ({
  createdAt: new Date(),
  createdById: "user_test123",
  date: new Date().toISOString().split("T")[0],
  description: "Test description",
  genre: "EDM" as const,
  id: 1,
  location: "Test Location",
  slug: "test-event",
  status: "published" as const,
  time: "20:00",
  title: "Test Event",
  updatedAt: new Date(),
  venue: "Test Venue",
  ...overrides,
});
