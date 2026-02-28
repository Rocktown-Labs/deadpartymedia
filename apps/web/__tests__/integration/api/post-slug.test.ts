import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/posts/[slug]/route'

vi.mock('next/cache', () => ({
  cacheTag: vi.fn(),
}))

vi.mock('@/lib/content/post-content', () => ({
  normalizeStoredPostContent: vi.fn(() => ({ tiptapDoc: null })),
}))

vi.mock('@tiptap/html', () => ({
  generateHTML: vi.fn(() => '<p>converted</p>'),
}))

vi.mock('@tiptap/starter-kit', () => ({
  default: {},
}))

vi.mock('@tiptap/extension-image', () => ({
  default: {},
}))

const { mockPostChain, mockArtistsChain, mockCommentChain } = vi.hoisted(() => {
  const mockPostChain = {
    select: vi.fn(),
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  }

  const mockArtistsChain = {
    select: vi.fn(),
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  }

  const mockCommentChain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
  }

  mockPostChain.select.mockReturnValue({ from: mockPostChain.from })
  mockPostChain.from.mockReturnValue({ leftJoin: mockPostChain.leftJoin })
  mockPostChain.leftJoin.mockReturnValue({ where: mockPostChain.where })
  mockPostChain.where.mockReturnValue({ limit: mockPostChain.limit })

  mockArtistsChain.select.mockReturnValue({ from: mockArtistsChain.from })
  mockArtistsChain.from.mockReturnValue({ innerJoin: mockArtistsChain.innerJoin })
  mockArtistsChain.innerJoin.mockReturnValue({ where: mockArtistsChain.where })
  mockArtistsChain.where.mockResolvedValue([])

  mockCommentChain.select.mockReturnValue({ from: mockCommentChain.from })
  mockCommentChain.from.mockReturnValue({ where: mockCommentChain.where })
  mockCommentChain.where.mockResolvedValue([])

  return { mockPostChain, mockArtistsChain, mockCommentChain }
})

let selectCallIndex = 0

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => {
      selectCallIndex += 1
      if (selectCallIndex === 1) return mockPostChain.select()
      if (selectCallIndex === 2) return mockArtistsChain.select()
      return mockCommentChain.select()
    }),
  },
}))

describe('GET /api/posts/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0

    mockPostChain.select.mockReturnValue({ from: mockPostChain.from })
    mockPostChain.from.mockReturnValue({ leftJoin: mockPostChain.leftJoin })
    mockPostChain.leftJoin.mockReturnValue({ where: mockPostChain.where })
    mockPostChain.where.mockReturnValue({ limit: mockPostChain.limit })

    mockArtistsChain.select.mockReturnValue({ from: mockArtistsChain.from })
    mockArtistsChain.from.mockReturnValue({ innerJoin: mockArtistsChain.innerJoin })
    mockArtistsChain.innerJoin.mockReturnValue({ where: mockArtistsChain.where })
    mockArtistsChain.where.mockResolvedValue([])

    mockCommentChain.select.mockReturnValue({ from: mockCommentChain.from })
    mockCommentChain.from.mockReturnValue({ where: mockCommentChain.where })
    mockCommentChain.where.mockResolvedValue([])
  })

  it('maps author name from joined user record', async () => {
    mockPostChain.limit.mockResolvedValue([
      {
        id: 1,
        title: 'Test Post',
        slug: 'test-post',
        category: 'EDM',
        excerpt: 'Excerpt',
        content: '<p>hello</p>',
        coverImage: null,
        authorId: 'clerk_user_123',
        status: 'published',
        isCoverStory: false,
        publishedAt: new Date('2026-02-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-30T00:00:00.000Z'),
        updatedAt: new Date('2026-02-02T00:00:00.000Z'),
        views: 10,
        authorFirstName: 'Jamie',
        authorLastName: 'River',
        authorEmail: 'jamie@example.com',
      },
    ])

    mockCommentChain.where.mockResolvedValue([{ count: 4 }])

    const request = new Request('http://localhost:3001/api/posts/test-post')
    const response = await GET(request, { params: Promise.resolve({ slug: 'test-post' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.author.id).toBe('clerk_user_123')
    expect(data.author.name).toBe('Jamie River')
    expect(data.comment_count).toBe(4)
  })

  it('falls back to Unknown when joined author fields are empty', async () => {
    mockPostChain.limit.mockResolvedValue([
      {
        id: 2,
        title: 'Fallback Post',
        slug: 'fallback-post',
        category: 'OTHER',
        excerpt: 'Excerpt',
        content: '<p>hello</p>',
        coverImage: null,
        authorId: 'clerk_user_999',
        status: 'published',
        isCoverStory: false,
        publishedAt: new Date('2026-02-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-30T00:00:00.000Z'),
        updatedAt: new Date('2026-02-02T00:00:00.000Z'),
        views: 0,
        authorFirstName: null,
        authorLastName: null,
        authorEmail: null,
      },
    ])

    const request = new Request('http://localhost:3001/api/posts/fallback-post')
    const response = await GET(request, { params: Promise.resolve({ slug: 'fallback-post' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.author.id).toBe('clerk_user_999')
    expect(data.author.name).toBe('Unknown')
  })
})
