import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { postImportSources, users, posts } from "@/lib/db/schema";
import { inArray, asc, eq } from "drizzle-orm";
import { checkRole } from "@/lib/auth/roles";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { getOffsetFromPage, parsePageParam, buildSearchParams } from "@/lib/admin/table-state";
import WordpressBackfillClient from "./wordpress-backfill-client";

interface WordPressRestPost {
  ID: number;
  title: string;
  URL: string;
  excerpt: string;
  content: string;
  date: string;
  modified: string;
  author: {
    name: string;
    nice_name: string;
  };
  featured_image?: string;
  categories?: Record<string, any>;
  tags?: Record<string, any>;
}

export const dynamic = "force-dynamic";

interface WordPressBackfillPageProps {
  searchParams: Promise<{ wp_page?: string }>;
}

export default async function WordPressBackfillPage({ searchParams }: WordPressBackfillPageProps) {
  // 1. Role verification
  const isSuperAdmin = await checkRole("super_admin");
  if (!isSuperAdmin) {
    redirect("/");
  }

  const params = await searchParams;
  const wpPage = parsePageParam(params.wp_page);
  const limit = 40;
  const offset = getOffsetFromPage(wpPage, limit);

  // 2. Fetch WordPress posts from WordPress REST API
  let wordpressPosts: any[] = [];
  let totalPosts = 0;
  try {
    const response = await fetch(
      `https://public-api.wordpress.com/rest/v1.1/sites/deadpartymedia.wordpress.com/posts?number=${limit}&offset=${offset}`,
      { cache: "no-store" },
    );

    if (response.ok) {
      const data = await response.json();
      totalPosts = data.found || 0;
      if (data && Array.isArray(data.posts)) {
        wordpressPosts = data.posts.map((post: WordPressRestPost) => {
          const coverImage = post.featured_image || null;
          const rawCategories = Object.keys(post.categories || {});
          const rawTags = Object.keys(post.tags || {});

          return {
            authorName: post.author?.name || "Petty Vandalism",
            authorSlug: post.author?.nice_name || "pettyvandalism",
            content: post.content,
            coverImage,
            date: post.date,
            excerpt: post.excerpt,
            id: post.ID,
            // to be populated
            importedPostId: null,
            localStatus: null,
            modified: post.modified,
            rawCategories,
            rawTags,
            title: post.title,
            url: post.URL,
          };
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch WordPress articles feed:", error);
  }

  // 3. Query already backfilled sources to match url status and local status (draft vs published)
  let importedUrlMap = new Map<string, { postId: number; status: string }>();
  try {
    const importedSources = await db
      .select({
        postId: postImportSources.postId,
        sourceUrl: postImportSources.sourceUrl,
        status: posts.status,
      })
      .from(postImportSources)
      .leftJoin(posts, eq(postImportSources.postId, posts.id));

    importedUrlMap = new Map(
      importedSources.map((row) => [
        row.sourceUrl,
        { postId: row.postId, status: row.status || "draft" },
      ]),
    );
  } catch (error) {
    console.error("Failed to query import sources:", error);
  }

  // Map database post IDs and statuses to WordPress feed posts
  for (const post of wordpressPosts) {
    const importInfo = importedUrlMap.get(post.url);
    post.importedPostId = importInfo ? importInfo.postId : null;
    post.localStatus = importInfo ? importInfo.status : null;
  }

  // 4. Fetch author options
  let authorOptions: { clerkId: string; name: string; role: string }[] = [];
  try {
    authorOptions = await db
      .select({
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.role, ["writer", "super_admin"]))
      .orderBy(asc(users.firstName), asc(users.lastName))
      .then((rows) =>
        rows.map((row) => ({
          clerkId: row.clerkId,
          name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email,
          role: row.role,
        })),
      );
  } catch (error) {
    console.error("Failed to query author options:", error);
  }

  return (
    <div className="py-6 space-y-6">
      <WordpressBackfillClient posts={wordpressPosts} authorOptions={authorOptions} />
      {totalPosts > limit && (
        <div className="mt-6 flex justify-center">
          <AdminPagination
            pathname="/admin/posts/wordpress"
            page={wpPage}
            pageParam="wp_page"
            searchParams={buildSearchParams({ wp_page: String(wpPage) })}
            totalItems={totalPosts}
            pageSize={limit}
          />
        </div>
      )}
    </div>
  );
}
