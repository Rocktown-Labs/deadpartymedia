import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { postImportSources, users } from "@/lib/db/schema";
import { inArray, asc } from "drizzle-orm";
import { checkRole } from "@/lib/auth/roles";
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
}

export const dynamic = "force-dynamic";

export default async function WordPressBackfillPage() {
  // 1. Role verification
  const isSuperAdmin = await checkRole("super_admin");
  if (!isSuperAdmin) {
    redirect("/");
  }

  // 2. Fetch latest WordPress posts from WordPress REST API
  let wordpressPosts: any[] = [];
  try {
    const response = await fetch(
      "https://public-api.wordpress.com/rest/v1.1/sites/deadpartymedia.wordpress.com/posts?number=40",
      { cache: "no-store" },
    );

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.posts)) {
        wordpressPosts = data.posts.map((post: WordPressRestPost) => {
          const coverImage = post.featured_image || null;
          const rawCategories = Object.keys(post.categories || {});

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
            modified: post.modified,
            rawCategories,
            title: post.title,
            url: post.URL,
          };
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch WordPress articles feed:", error);
  }

  // 3. Query already backfilled sources to match url status
  let importedUrlMap = new Map<string, number>();
  try {
    const importedSources = await db
      .select({
        postId: postImportSources.postId,
        sourceUrl: postImportSources.sourceUrl,
      })
      .from(postImportSources);

    importedUrlMap = new Map(importedSources.map((row) => [row.sourceUrl, row.postId]));
  } catch (error) {
    console.error("Failed to query import sources:", error);
  }

  // Map database post IDs to WordPress feed posts
  for (const post of wordpressPosts) {
    post.importedPostId = importedUrlMap.get(post.url) || null;
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
    <div className="py-6">
      <WordpressBackfillClient posts={wordpressPosts} authorOptions={authorOptions} />
    </div>
  );
}
