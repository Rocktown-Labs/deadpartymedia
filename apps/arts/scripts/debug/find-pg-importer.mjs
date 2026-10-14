// Find the app module whose transformed source references pg / @dpmedia/db
import { chromium } from "/home/ubuntu/work/clients/deadpartymedia/node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3111";
const browser = await chromium.launch();
const page = await browser.newPage();

const jsUrls = [];
page.on("response", (res) => {
  if (res.url().endsWith(".js") || res.url().includes(".tsx") || res.url().includes(".ts")) {
    if (res.status() === 200) jsUrls.push(res.url());
  }
});

await page.goto(`${BASE}/exhibitions`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(2500);

console.log(`captured ${jsUrls.length} modules; scanning transformed sources...\n`);
for (const url of jsUrls) {
  try {
    const res = await page.request.get(url);
    const text = await res.text();
    if (
      /@dpmedia\/db|node-postgres|\.pnpm\/pg@|from\s*["']pg["']|\bnew Pool\b|drizzle/.test(text)
    ) {
      const hits = [];
      for (const pattern of [
        /@dpmedia\/db[^"']*/,
        /node_modules\/\.pnpm\/[^"'\s]*pg[^"'\s]*/,
        /drizzle[^"'\s]{0,40}/g,
      ]) {
        const m = text.match(pattern);
        if (m) hits.push(...m.slice(0, 3));
      }
      console.log(`>> ${url.replace(BASE, "")}`);
      for (const h of [...new Set(hits)].slice(0, 6)) console.log(`     ${h}`);
    }
  } catch {}
}
await browser.close();
