
import { createImageMirror } from "../../../scripts/lib/image-mirror";

describe("image-mirror", () => {
  it("deduplicates image mirrors per run", async () => {
    const downloadImage = vi
      .fn()
      .mockResolvedValue({ bytes: new ArrayBuffer(8), contentType: "image/png" });
    const uploadImage = vi
      .fn()
      .mockResolvedValue("https://blob.example.com/posts/content/mock.png");

    const mirror = createImageMirror({
      downloadImage,
      dryRun: false,
      uploadImage,
    });

    const first = await mirror.mirrorImageUrl(
      "https://deadpartymedia.wordpress.com/wp-content/uploads/2026/02/test.png",
      "content",
    );
    const second = await mirror.mirrorImageUrl(
      "https://deadpartymedia.wordpress.com/wp-content/uploads/2026/02/test.png",
      "content",
    );

    expect(first).toBe("https://blob.example.com/posts/content/mock.png");
    expect(second).toBe("https://blob.example.com/posts/content/mock.png");
    expect(downloadImage).toHaveBeenCalledOnce();
    expect(uploadImage).toHaveBeenCalledOnce();
  });

  it("keeps original inline URL when mirroring fails", async () => {
    const onWarn = vi.fn();
    const mirror = createImageMirror({
      downloadImage: async (sourceUrl) => {
        if (sourceUrl.includes("fail")) {
          throw new Error("download failure");
        }

        return { bytes: new ArrayBuffer(4), contentType: "image/jpeg" };
      },
      dryRun: false,
      onWarn,
      uploadImage: async ({ pathname }) => `https://blob.example.com/${pathname}`,
    });

    const result = await mirror.mirrorInlineImagesInHtml(
      '<p><img src="https://example.com/success.jpg" /><img src="https://example.com/fail.jpg" /></p>',
      "https://deadpartymedia.wordpress.com/",
    );

    expect(result.replacedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.html).toContain("https://blob.example.com/");
    expect(result.html).toContain("https://example.com/fail.jpg");
    expect(onWarn).toHaveBeenCalledOnce();
  });
});
