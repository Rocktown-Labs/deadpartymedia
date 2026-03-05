import { waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../../tests/helpers/render";

const mockMutate = vi.fn();

vi.mock<typeof import("@/lib/api/articles")>(import("@/lib/api/articles"), () => ({
  useArticle: vi.fn(() => ({
    data: {
      author: { id: "author_1", name: "Test Author" },
      category: "COUNTRY",
      comment_count: 0,
      content: "<p>Test content</p>",
      cover_image: "/cover.jpg",
      id: 101,
      published_at: "2026-02-02T00:00:00.000Z",
      slug: "test-article",
      title: "Test Article",
    },
    isLoading: false,
  })),
}));

vi.mock<typeof import("@/lib/api/user-activity")>(import("@/lib/api/user-activity"), () => ({
  useMarkArticleRead: vi.fn(() => ({
    mutate: mockMutate,
  })),
}));

vi.mock<typeof import("@clerk/nextjs")>(import("@clerk/nextjs"), async () => {
  const actual = await vi.importActual<typeof import("@clerk/nextjs")>("@clerk/nextjs");

  return {
    ...actual,
    useUser: vi.fn(() => ({
      isSignedIn: true,
      user: {
        id: "user_1",
      },
    })),
  };
});

vi.mock<typeof import("@/components/seo/structured-data")>(
  import("@/components/seo/structured-data"),
  () => ({
    ArticleStructuredData: () => null,
  }),
);

vi.mock<typeof import("@/components/comments/article-comments")>(
  import("@/components/comments/article-comments"),
  () => ({
    ArticleComments: () => <div data-testid="article-comments" />,
  }),
);

vi.mock<typeof import("@/components/merch/merch-carousel")>(
  import("@/components/merch/merch-carousel"),
  () => ({
    MerchCarousel: () => <div data-testid="merch-carousel" />,
  }),
);

vi.mock<typeof import("posthog-js")>(import("posthog-js"), () => ({
  default: {
    capture: vi.fn(),
  },
}));

import { ArticlePageClient } from "@/app/article/[slug]/article-page-client";

describe("article page client read tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks an article as read once for the same user/article across re-renders", async () => {
    const { rerender } = renderWithProviders(<ArticlePageClient slug="test-article" />);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    rerender(<ArticlePageClient slug="test-article" />);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    expect(mockMutate).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });
});
