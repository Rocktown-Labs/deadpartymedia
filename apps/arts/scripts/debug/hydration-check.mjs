// Check hydration + interactivity on prod
import { chromium } from "/home/ubuntu/work/clients/deadpartymedia/node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.mjs";

const BASE = process.env.BASE_URL ?? "https://arts.deadpartymedia.com";
const browser = await chromium.launch();
const page = await browser.newPage();

const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 300)));

await page.goto(`${BASE}/exhibitions`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(3000);

const state = await page.evaluate(() => {
  const main = document.querySelector("main");
  const keys = main ? Object.keys(main) : [];
  const hasFiber = keys.some(
    (k) => k.startsWith("__reactFiber") || k.startsWith("__reactContainer"),
  );
  const rootEl = document.querySelector("div");
  const rootKeys = rootEl
    ? Object.keys(rootEl)
        .filter((k) => k.startsWith("__react"))
        .slice(0, 3)
    : [];
  return {
    hasFiber,
    rootKeys,
    title: document.title,
    scripts: [...document.querySelectorAll("script")].length,
  };
});
console.log("state:", JSON.stringify(state));

// click Painting pill
const pill = page.locator("button", { hasText: "PAINTING" }).first();
await pill.click();
await page.waitForTimeout(2500);
console.log("url after pill click:", page.url());
const countText = await page.evaluate(() => {
  const el = [...document.querySelectorAll("span")].find((s) =>
    /Artworks?/i.test(s.textContent ?? ""),
  );
  return el?.textContent ?? "not found";
});
console.log("count text:", countText);
console.log("cards:", await page.locator("article").count());
console.log("pageerrors:", pageErrors.length ? pageErrors : "none");
await browser.close();
