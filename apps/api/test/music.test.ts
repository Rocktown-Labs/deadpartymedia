import { env, introspectWorkflowInstance } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import { app } from "../src/index";
import { eq } from "drizzle-orm";
import { getMusicDb } from "../src/db";
import {
  artists,
  posts,
  users,
  articleComments,
  postArtists,
  backfillRuns,
} from "@dpmedia/db/schema";
import { client, grant, signUp, type TestIdentity } from "./helpers";

describe("music native D1 API", () => {
  let admin: TestIdentity, writer: TestIdentity, fan: TestIdentity, artsAdmin: TestIdentity;
  beforeAll(async () => {
    admin = await signUp("music-admin@example.test");
    writer = await signUp("writer@example.test");
    fan = await signUp("fan@example.test");
    artsAdmin = await signUp("arts-admin@example.test");
    await grant(admin, "music", "super_admin");
    await grant(writer, "music", "writer");
    await grant(artsAdmin, "arts", "super_admin");
    const db = getMusicDb(env);
    await db.insert(users).values(
      [admin, writer, fan].map((identity) => ({
        clerkId: identity.userId,
        email: identity.email,
        firstName: "Test",
        role:
          identity === fan
            ? ("fan" as const)
            : identity === writer
              ? ("writer" as const)
              : ("super_admin" as const),
        onboardingComplete: true,
      })),
    );
    await db.insert(posts).values([
      {
        id: 101,
        title: "Published",
        slug: "published",
        category: "OTHER",
        excerpt: "Test",
        content:
          '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Stored content"}]}]}',
        authorId: writer.userId,
        status: "published",
        vertical: "music",
      },
      {
        id: 102,
        title: "Private draft",
        slug: "private-draft",
        category: "OTHER",
        excerpt: "Test",
        content: "Draft",
        authorId: writer.userId,
        status: "draft",
        vertical: "music",
      },
      {
        id: 103,
        title: "Other writer",
        slug: "other-writer",
        category: "OTHER",
        excerpt: "Test",
        content: "Other",
        authorId: admin.userId,
        status: "published",
        vertical: "music",
      },
    ]);
  });
  it("lists published posts and renders stored TipTap content", async () => {
    const response = await client().music.posts.$get({ query: { limit: "100" } });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect("results" in data && data.results.map((row) => row.slug)).toEqual([
      "published",
      "other-writer",
    ]);
    const detail = await client().music.posts[":slug"].$get({
      param: { slug: "published" },
      query: {},
    });
    const article = await detail.json();
    expect("content" in article && article.content).toContain("<p>Stored content</p>");
  });
  it("does not expose drafts through public slug lookups", async () => {
    expect(
      (await client().music.posts[":slug"].$get({ param: { slug: "private-draft" }, query: {} }))
        .status,
    ).toBe(404);
  });
  it("rejects arts-only administrators at music mutation and desk boundaries", async () => {
    expect(
      (
        await client(artsAdmin.cookie).music.actions.admin.posts.deletePost.$post({
          json: { id: 101 },
        })
      ).status,
    ).toBe(403);
    expect(
      (await client(artsAdmin.cookie).music.pages.admin.posts.$get({ query: {} })).status,
    ).toBe(403);
  });
  it("projects native identity updates without changing app membership", async () => {
    const identity = await signUp("profile-update@example.test");
    await getMusicDb(env)
      .insert(users)
      .values({ clerkId: identity.userId, email: identity.email, firstName: "Test", role: "fan" });
    const response = await app.request(
      "http://localhost:3000/api/auth/update-user",
      {
        method: "POST",
        headers: {
          cookie: identity.cookie,
          origin: "http://localhost:3001",
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "Updated Fan" }),
      },
      env,
    );
    expect(response.status).toBe(200);
    const [row] = await getMusicDb(env)
      .select()
      .from(users)
      .where(eq(users.clerkId, identity.userId));
    expect([row?.firstName, row?.lastName]).toEqual(["Updated", "Fan"]);
    expect(row?.role).toBe("fan");
    expect((await client(identity.cookie).music.pages.admin.posts.$get({ query: {} })).status).toBe(
      403,
    );
  });
  it("loads static editor routes before parameter routes", async () => {
    const paths = [
      "posts/new",
      "posts/wordpress",
      "artists/new",
      "artists/import",
      "events/new",
      "events/import",
      "music/new",
      "music/submissions",
      "venues/new",
    ];
    for (const path of paths) {
      const response = await app.request(
        `http://localhost:3000/music/pages/admin/${path}`,
        { headers: { cookie: admin.cookie } },
        env,
      );
      expect({ path, status: response.status }).toEqual({ path, status: 200 });
    }
  });
  it("publishes drafts with native millisecond timestamps", async () => {
    const response = await client(
      writer.cookie,
    ).music.actions.admin.posts.bulkUpdatePostStatus.$post({
      json: { formData: { postIds: "102", status: "published" } },
    });
    expect(response.status).toBe(200);
    const [row] = await getMusicDb(env).select().from(posts).where(eq(posts.id, 102));
    expect(row?.status).toBe("published");
    expect(row?.publishedAt?.getTime()).toBeGreaterThan(1700000000000);
    await getMusicDb(env)
      .update(posts)
      .set({ status: "draft", publishedAt: null })
      .where(eq(posts.id, 102));
  });
  it("rejects anonymous editorial writes", async () => {
    expect(
      (await client().music.actions.admin.posts.deletePost.$post({ json: { id: 101 } })).status,
    ).toBe(401);
  });
  it("preserves writer ownership checks", async () => {
    const result = await client(writer.cookie).music.actions.admin.posts.updatePost.$post({
      json: { id: 103, formData: { title: "Attempted overwrite" } },
    });
    expect(result.status).toBe(403);
    const [row] = await getMusicDb(env).select().from(posts).where(eq(posts.id, 103));
    expect(row?.title).toBe("Other writer");
  });
  it("allows validated native editorial creation", async () => {
    const response = await client(writer.cookie).music.actions.admin.posts.createPost.$post({
      json: {
        formData: {
          title: "Created through RPC",
          slug: "rpc-created",
          category: "OTHER",
          excerpt: "A complete article",
          content: "<p>Native API</p>",
          status: "published",
          isCoverStory: "false",
          artistIds: "[]",
        },
      },
    });
    expect(response.status).toBe(200);
    const [row] = await getMusicDb(env).select().from(posts).where(eq(posts.slug, "rpc-created"));
    expect(row?.authorId).toBe(writer.userId);
  });
  it("keeps deletion approval scoped to music administrators", async () => {
    const [post] = await getMusicDb(env)
      .insert(posts)
      .values({
        title: "Deletion review",
        slug: "deletion-review",
        category: "OTHER",
        excerpt: "Review",
        content: "<p>Review</p>",
        authorId: writer.userId,
        status: "published",
        vertical: "music",
      })
      .returning();
    expect(post).toBeDefined();
    expect(
      (
        await client(writer.cookie).music.actions.admin.posts.requestDeletePost.$post({
          json: { id: post!.id },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await client(artsAdmin.cookie).music.actions.admin.posts.approveDeletePost.$post({
          json: { id: post!.id },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await client(admin.cookie).music.actions.admin.posts.approveDeletePost.$post({
          json: { id: post!.id },
        })
      ).status,
    ).toBe(200);
    expect(await getMusicDb(env).select().from(posts).where(eq(posts.id, post!.id))).toHaveLength(
      0,
    );
  });
  it("uses per-user article reads and saves without duplicate rows", async () => {
    for (let i = 0; i < 2; i++) {
      expect(
        (await client(fan.cookie).music.user.articles.read.$post({ json: { article_id: 101 } }))
          .status,
      ).toBe(200);
      expect(
        (await client(fan.cookie).music.user.articles.saved.$post({ json: { article_id: 101 } }))
          .status,
      ).toBeLessThan(300);
    }
    const stats = await client(fan.cookie).music.user.stats.$get({ query: {} });
    const body = await stats.json();
    expect(body).toMatchObject({
      articles_read_count: 1,
      articles_saved_count: 1,
      comments_count: 0,
    });
  });
  it("validates comments and requires completed onboarding", async () => {
    const anonymous = await client().music.articles[":slug"].comments.$post({
      param: { slug: "published" },
      json: { content: "Hello" },
    });
    expect(anonymous.status).toBe(401);
    const response = await client(fan.cookie).music.articles[":slug"].comments.$post({
      param: { slug: "published" },
      json: { content: "Thoughtful comment" },
    });
    expect(response.status).toBe(201);
    const [comment] = await getMusicDb(env)
      .select()
      .from(articleComments)
      .where(eq(articleComments.clerkUserId, fan.userId));
    expect(comment?.userName).toBe("Test User");
  });
  it("uploads to native R2 and serves identical public bytes", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const response = await client(writer.cookie).music.upload.$post({
      query: { type: "content" },
      form: { file: new File([bytes], "test.png", { type: "image/png" }) },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    if (!("pathname" in body)) throw new Error("Upload failed");
    expect(body.pathname).toContain(writer.userId);
    const object = await env.MUSIC_MEDIA.get(body.pathname);
    expect(new Uint8Array(await object!.arrayBuffer())).toEqual(bytes);
    const publicResponse = await app.request(
      `http://localhost:3000/music/media/${body.pathname}`,
      {},
      env,
    );
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await publicResponse.arrayBuffer())).toEqual(bytes);
  });
  it("rejects HTML disguised as an image and blocks fan uploads", async () => {
    const html = new File(["<script>bad()</script>"], "bad.html", { type: "text/html" });
    expect(
      (
        await client(writer.cookie).music.upload.$post({
          query: { type: "content" },
          form: { file: html },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await client(fan.cookie).music.upload.$post({
          query: { type: "content" },
          form: { file: new File(["x"], "x.png", { type: "image/png" }) },
        })
      ).status,
    ).toBe(403);
  });
  it("merges artists atomically and deduplicates shared relations", async () => {
    const db = getMusicDb(env);
    await db.insert(artists).values([
      {
        id: 201,
        name: "Source",
        slug: "source",
        genre: "OTHER",
        location: "AR",
        bio: "Source bio",
      },
      {
        id: 202,
        name: "Target",
        slug: "target",
        genre: "OTHER",
        location: "AR",
        bio: "Target bio",
      },
    ]);
    await db.insert(postArtists).values([
      { artistId: 201, postId: 101 },
      { artistId: 202, postId: 101 },
    ]);
    const response = await client(
      admin.cookie,
    ).music.actions.admin.artists.mergeArtistRecords.$post({
      json: { sourceArtistId: 201, formData: { targetArtistId: "202" } },
    });
    expect(response.status).toBe(200);
    expect(await db.select().from(artists).where(eq(artists.id, 201))).toEqual([]);
    expect(
      (await db.select().from(postArtists).where(eq(postArtists.postId, 101))).map(
        (row) => row.artistId,
      ),
    ).toEqual([202]);
  });
  it("runs the native backfill Workflow without a Vercel dependency", async () => {
    const id = crypto.randomUUID();
    await getMusicDb(env)
      .insert(backfillRuns)
      .values({ runId: id, status: "running", totalPosts: 0, processedPosts: 0, results: [] });
    await using workflow = await introspectWorkflowInstance(env.BACKFILL, id);
    await workflow.modify(async (modifier) => {
      await modifier.disableSleeps();
    });
    await env.BACKFILL.create({
      id,
      params: {
        runId: id,
        limit: 1,
        offset: 9999,
        authorId: admin.userId,
        status: "draft",
        source: "local_drafts",
      },
    });
    await workflow.waitForStatus("complete");
    expect(await workflow.getOutput()).toMatchObject({ processed: 0 });
  });
});
