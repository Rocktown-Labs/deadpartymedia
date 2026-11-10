import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createImageMirror } from "../src/lib/music/image-mirror";
describe("native R2 import image mirror", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("Unexpected outbound request");
    });
  });
  afterEach(() => vi.restoreAllMocks());
  it("copies public image bytes once and rewrites inline attributes without dropping markup", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("image-bytes", { headers: { "content-type": "image/png" } }),
    );
    const mirror = createImageMirror(env),
      url = await mirror.mirrorImageUrl("https://images.example.test/cover.png", "cover");
    expect(await mirror.mirrorImageUrl("https://images.example.test/cover.png", "content")).toBe(
      url,
    );
    const html = await mirror.mirrorInlineImagesInHtml(
      '<figure><img src="/cover.png" srcset="/small.png 300w" alt="Original alt"><figcaption>Keep caption</figcaption></figure>',
      "https://images.example.test/post",
    );
    expect(html.html).toContain(url);
    expect(html.html).toContain('alt="Original alt"');
    expect(html.html).toContain("Keep caption");
    expect(html.html).not.toContain("srcset");
    const key = url.split("/api/media/")[1]!;
    expect(await (await env.MUSIC_MEDIA.get(key))!.text()).toBe("image-bytes");
  });
  it("retains failed remote image links and reports the failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("missing", { status: 404 }));
    const result = await createImageMirror(env).mirrorInlineImagesInHtml(
      '<p>Content</p><img src="/missing.png" alt="Still present">',
      "https://images.example.test/post",
    );
    expect(result.failedCount).toBe(1);
    expect(result.html).toContain('src="/missing.png"');
    expect(result.html).toContain("Content");
  });
  it("rejects non-HTTPS and loopback sources", async () => {
    const mirror = createImageMirror(env);
    await expect(mirror.mirrorImageUrl("http://localhost/a.png", "cover")).rejects.toThrow(
      "public HTTPS",
    );
  });
});
