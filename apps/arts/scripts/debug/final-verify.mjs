// Full production verification: hydration, counts, infinite scroll, filters
import { chromium } from "/home/ubuntu/work/clients/deadpartymedia/node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.mjs";

const BASE = "https://arts.deadpartymedia.com";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(err.message.slice(0, 120)));

await page.goto(`${BASE}/exhibitions`, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4000);

const cardCount = () => page.locator("article").count();
console.log("1. cards on load:", await cardCount());

// counts + badges
const counts = await page.evaluate(() => {
  const badges = [...document.querySelectorAll("span")].filter((s) =>
    /^\d+$/.test((s.textContent || "").trim()),
  );
  return badges.map((b) => b.textContent.trim());
});
console.log("2. pill badges:", counts.join(", "));
const total = counts[0];
const sum = counts.slice(1).reduce((a, b) => a + Number(b), 0);
console.log(`   All=${total}, sum of categories=${sum}, match: ${Number(total) === sum}`);

// infinite scroll
let scrollChecks = [];
for (let i = 0; i < 6; i++) {
  await page.mouse.wheel(0, 5000);
  await page.waitForTimeout(1500);
  scrollChecks.push(await cardCount());
}
console.log("3. cards during scroll:", scrollChecks.join(" -> "));
const sentinel = await page
  .locator("div.py-8.text-center")
  .first()
  .innerText()
  .catch(() => "n/a");
console.log("   sentinel:", sentinel.replace(/\n/g, " | "));

// filter navigation
await page.goto(`${BASE}/exhibitions?medium=painting`, { waitURL: undefined, waitUntil: "load" });
await page.waitForTimeout(3000);
const paintingCount = await page.evaluate(() => {
  const el = [...document.querySelectorAll("span")].find((s) => /Artwork/i.test(s.textContent || ""));
  return el ? el.textContent.trim() : "not found";
});
const paintingCards = await cardCount();
console.log(`4. painting: "${paintingCount}" text, ${paintingCards} cards (SSR first page)`);

console.log("5. page errors:", errors.length ? errors : "none");
await browser.close();
