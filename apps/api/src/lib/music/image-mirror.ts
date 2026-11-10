import type { Bindings } from "../../bindings";
import { r2Put } from "../r2";
export function createImageMirror(env: Bindings) {
  const mirrored = new Map<string, string>();
  async function mirrorImageUrl(source: string, kind: "cover" | "content") {
    const cached = mirrored.get(source);
    if (cached) return cached;
    const url = new URL(source);
    if (url.protocol !== "https:" || url.hostname === "localhost" || /^[\d.:]+$/.test(url.hostname))
      throw new Error("A public HTTPS image is required");
    const response = await fetch(url, { redirect: "error" });
    const contentType = response.headers.get("content-type")?.split(";")[0] || "";
    if (
      !response.ok ||
      !response.body ||
      !["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"].includes(contentType)
    )
      throw new Error("Image download failed");
    let size = 0;
    const stream = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          size += chunk.byteLength;
          if (size > 12 * 1024 * 1024) throw new Error("Image exceeds 12 MB");
          controller.enqueue(chunk);
        },
      }),
    );
    const bytes = await new Response(stream).arrayBuffer();
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)),
    );
    const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
    const result = await r2Put(env, `imports/${kind}/${hash}.${extension}`, bytes, contentType);
    mirrored.set(source, result);
    return result;
  }
  async function mirrorInlineImagesInHtml(html: string, base: string) {
    let replacedCount = 0,
      failedCount = 0;
    const rewritten = new HTMLRewriter()
      .on("img", {
        async element(element) {
          const src = element.getAttribute("src");
          if (!src) return;
          try {
            element.setAttribute(
              "src",
              await mirrorImageUrl(new URL(src, base).toString(), "content"),
            );
            element.removeAttribute("srcset");
            replacedCount++;
          } catch {
            failedCount++;
          }
        },
      })
      .transform(new Response(html, { headers: { "Content-Type": "text/html" } }));
    return { html: await rewritten.text(), replacedCount, failedCount };
  }
  return { mirrorImageUrl, mirrorInlineImagesInHtml };
}
