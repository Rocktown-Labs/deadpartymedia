// Check hydration on homepage + find Buffer in prod bundles
import { chromium } from "/home/ubuntu/work/clients/deadpartymedia/node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.mjs";

const browser = await chromium.launch();

for (const path of ["/", "/artmakers", "/events"]) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err).slice(0, 160)));
  await page.goto(`https://arts.deadpartymedia.com${path}`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2500);
  const state = await page.evaluate(() => {
    const el = document.querySelector("main") ?? document.body.firstElementChild;
    const keys = el ? Object.keys(el) : [];
    return { hasFiber: keys.some((k) => k.startsWith("__react")) };
  });
  console.log(
    `${path}: hasFiber=${state.hasFiber} errors=${errors.length ? errors.join(" | ") : "none"}`,
  );
  await page.close();
}

// Find Buffer reference in client bundles
const page = await browser.newPage();
const jsUrls = [];
page.on("response", async (res) => {
  const url = res.url();
  if (url.endsWith(".js") && res.status() === 200) jsUrls.push(url);
});
await page.goto("https://arts.deadpartymedia.com/exhibitions", {
  waitUntil: "load",
  timeout: 45000,
});
await page.waitForTimeout(2000);
console.log(`\nscanned ${jsUrls.length} js files`);
for (const url of jsUrls) {
  try {
    const res = await page.request.get(url);
    const text = await res.text();
    if (/\bBuffer\b/.test(text)) {
      const idx = text.search(/\bBuffer\b/);
      const line = text.slice(Math.max(0, idx - 200), idx + 120).replace(/\n/g, " ");
      console.log(`\nBUFFER in: ${url.slice(-90)}\n  ...${line}`);
    }
  } catch {
    console.log("fetch fail", url.slice(-60));
  }
}
await browser.close();
