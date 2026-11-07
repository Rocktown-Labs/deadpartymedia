import { describe, expect, it, vi } from "vite-plus/test";
import { Hono } from "hono";
import { clerkAuth } from "../src/auth";
import type { AppEnv } from "../src/bindings";
import { musicOgRoutes, renderOgHtml } from "../src/routes/music/og";
import type { OgData } from "../src/routes/music/og";

/**
 * Port of apps/web/src/app/api/og/[type]/[slug]/route.tsx (@vercel/og →
 * workers-og).
 *
 * The source resolved data via internal HTTP; the port queries the DB
 * directly. Either way, a failed/missing lookup yields null and the
 * source answered `new Response("Not Found", { status: 404 })` — this is
 * that shape, reproduced without touching the network (no usable
 * DATABASE_URL means the article lookup throws and resolves to null, and
 * unknown types return null before any DB access).
 *
 * workers-og is mocked because its wasm/HTMLRewriter engine only runs in
 * workerd — the wasm render itself cannot execute under Node, but the
 * markup handed to workers-og is pure string building and IS covered here.
 */
vi.mock("workers-og", () => ({
  ImageResponse: class ImageResponse extends Response {
    constructor(_element: string, _options: { height: number; width: number }) {
      super();
    }
  },
}));
const env = {
  DATABASE_URL: "",
  CLERK_SECRET_KEY: "sk_test_missing",
  CLERK_PUBLISHABLE_KEY: "",
};

function musicApp() {
  const app = new Hono<AppEnv>();
  app.use("*", clerkAuth());
  const music = new Hono<AppEnv>();
  music.route("/", musicOgRoutes);
  app.route("/music", music);
  return app;
}

describe("GET /music/og/:type/:slug", () => {
  it("returns the source's not-found shape when the lookup fails", async () => {
    const response = await musicApp().request("/music/og/article/nonexistent", {}, env);
    expect(response.status).toBe(404);
    // Source: new Response("Not Found", { status: 404 })
    expect(await response.text()).toBe("Not Found");
    expect(response.headers.get("content-type")?.startsWith("text/plain")).toBe(true);
  });

  it("404s unknown types without a lookup — the source has no product case", async () => {
    const response = await musicApp().request("/music/og/product/nonexistent", {}, env);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  it("404s missing artists with the same shape", async () => {
    const response = await musicApp().request("/music/og/artist/nonexistent", {}, env);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });
});

describe("renderOgHtml (markup parity with the source JSX)", () => {
  const defaultOgImage = "https://www.deadpartymedia.com/images/dead-party-logo-og.jpg";

  it("renders an article exactly like the source JSX tree", () => {
    const data: OgData = {
      author: "Jane Doe",
      category: "EDM",
      description: "A test excerpt.",
      image: defaultOgImage,
      title: "Test Title",
      type: "article",
    };

    // Hand-derived from apps/web/src/app/api/og/[type]/[slug]/route.tsx:
    // root flex column on #0A0A0A, full-bleed dark overlay, centered
    // content, brand badge, 72px title (≤ 60 chars), grey description,
    // bottom-right site branding. Default OG image → no background-image.
    expect(renderOgHtml({}, data)).toBe(
      `<div style="align-items:center;background-color:#0A0A0A;background-position:center;background-size:cover;display:flex;flex-direction:column;height:100%;justify-content:center;position:relative;width:100%">` +
        `<div style="background-color:rgba(10, 10, 10, 0.7);bottom:0;left:0;position:absolute;right:0;top:0"></div>` +
        `<div style="align-items:center;display:flex;flex-direction:column;justify-content:center;padding:60px;width:100%;z-index:1">` +
        `<div style="background-color:#7CFC00;border-radius:4px;color:#000;font-size:18px;font-weight:bold;margin-bottom:20px;padding:8px 16px;text-transform:uppercase">EDM</div>` +
        `<h1 style="color:#FFFFFF;font-size:72px;font-weight:900;line-height:1.1;margin-bottom:20px;max-width:1000px;text-align:center">Test Title</h1>` +
        `<p style="color:#CCCCCC;font-size:28px;line-height:1.4;margin-bottom:20px;max-width:900px;text-align:center">A test excerpt.</p>` +
        `<div style="bottom:40px;color:#7CFC00;font-size:24px;font-weight:bold;position:absolute;right:60px">Dead Party Media</div>` +
        `</div></div>`,
    );
  });

  it("renders event data with a cover background, date/venue line and truncated description", () => {
    const data: OgData = {
      date: "11/7/2026",
      description: "L".repeat(160),
      image: "https://example.com/cover.jpg",
      title: "Test Event",
      type: "event",
      venue: "The Venue",
    };

    const html = renderOgHtml({}, data);
    // Non-default cover image becomes the flex root background.
    expect(html).toContain(
      "background-image:url(https://example.com/cover.jpg);background-position:center",
    );
    // No badge for events; description truncates at 150 chars with "...".
    expect(html).not.toContain("text-transform:uppercase");
    expect(html).toContain(`>${"L".repeat(150)}...<`);
    // Date + venue line in brand color.
    expect(html).toContain(
      `<div style="color:#7CFC00;font-size:24px;font-weight:bold;margin-top:10px">11/7/2026 • The Venue</div>`,
    );
  });

  it("renders artist data with genre badge, location line, smaller long titles, escaped text", () => {
    const data: OgData = {
      description: "Bio text",
      genre: "HIP-HOP & R&B",
      image: defaultOgImage,
      location: "Little Rock, AR",
      title: "AT&T <Live>",
      type: "artist",
    };

    const html = renderOgHtml({}, data);
    expect(html).toContain(
      `<div style="background-color:#7CFC00;border-radius:4px;color:#000;font-size:18px;font-weight:bold;margin-bottom:20px;padding:8px 16px;text-transform:uppercase">HIP-HOP &amp; R&amp;B</div>`,
    );
    // Titles longer than 60 chars drop to 56px (source behavior).
    expect(renderOgHtml({}, { ...data, title: "A".repeat(61) })).toContain("font-size:56px");
    expect(html).toContain("font-size:72px");
    // Text nodes are entity-escaped; workers-og's HTML parser decodes them
    // back to the original strings before satori renders.
    expect(html).toContain(`>AT&amp;T &lt;Live&gt;</h1>`);
    expect(html).toContain(
      `<div style="color:#7CFC00;font-size:24px;font-weight:bold;margin-top:10px">Little Rock, AR</div>`,
    );
  });
});
