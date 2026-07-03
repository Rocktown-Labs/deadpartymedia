import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  listPublishedArticles,
  parseArticleLimit,
  parseArticleOffset,
} from "@/lib/api/articles.server";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = parseArticleLimit(searchParams.get("limit"));
    const offset = parseArticleOffset(searchParams.get("offset"));
    const coverStory = searchParams.get("cover_story") === "true";
    const articles = await listPublishedArticles({ category, coverStory, limit, offset });

    return NextResponse.json(
      {
        count: articles.length,
        results: articles,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    log.error({ error: sanitizeError(error), operation: "fetch_posts" }, "Error fetching posts");
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
