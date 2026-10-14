// Debug script: instrument IntersectionObserver on prod exhibitions page
import { chromium } from "/home/ubuntu/work/clients/deadpartymedia/node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.mjs";

const BASE = process.env.BASE_URL ?? "https://arts.deadpartymedia.com";

const browser = await chromium.launch();
const page = await browser.newPage();

await page.addInitScript(() => {
  window.__ioLog = [];
  const OriginalIO = window.IntersectionObserver;
  class WrappedIO extends OriginalIO {
    constructor(cb, opts) {
      super(cb, opts);
      this._cb = cb;
      window.__ioLog.push({ type: "construct", opts: JSON.stringify(opts) });
    }
    observe(el) {
      const rect = el?.getBoundingClientRect();
      window.__ioLog.push({
        type: "observe",
        className: el?.className?.slice?.(0, 80),
        rectTop: rect ? Math.round(rect.top) : null,
        rectHeight: rect ? Math.round(rect.height) : null,
      });
      return super.observe(el);
    }
  }
  window.IntersectionObserver = WrappedIO;
  const origFetch = window.fetch;
  window.fetch = (...args) => {
    const url = typeof args[0] === "string" ? args[0] : (args[0]?.url ?? "");
    if (
      !url.includes("clerk") &&
      !url.includes(".js") &&
      !url.includes(".css") &&
      !url.includes(".png") &&
      !url.includes(".jpg") &&
      !url.includes(".webp")
    ) {
      window.__ioLog.push({ type: "fetch", url: String(url).slice(0, 120) });
    }
    return origFetch(...args);
  };
});

await page.goto(`${BASE}/exhibitions`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(2500);
console.log("cards after load:", await page.locator("article").count());

for (let i = 0; i < 3; i++) {
  await page.mouse.wheel(0, 5000);
  await page.waitForTimeout(1200);
}

const scrollInfo = await page.evaluate(() => {
  const sentinel = document.querySelector('div[class*="py-8"]');
  const rect = sentinel?.getBoundingClientRect();
  return {
    scrollY: Math.round(window.scrollY),
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    sentinelTop: rect ? Math.round(rect.top) : null,
    sentinelHeight: rect ? Math.round(rect.height) : null,
    log: window.__ioLog,
  };
});

console.log(
  "scroll info:",
  JSON.stringify(
    {
      scrollY: scrollInfo.scrollY,
      innerHeight: scrollInfo.innerHeight,
      scrollHeight: scrollInfo.scrollHeight,
      sentinelTop: scrollInfo.sentinelTop,
      sentinelHeight: scrollInfo.sentinelHeight,
    },
    null,
    2,
  ),
);
console.log("IO log:");
for (const entry of scrollInfo.log) {
  console.log("  ", JSON.stringify(entry).slice(0, 220));
}
await browser.close();
