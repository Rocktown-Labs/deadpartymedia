// Trace which dev modules import the pg driver / db root
import { chromium } from "/home/ubuntu/work/clients/deadpartymedia/node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3111";
const browser = await chromium.launch();
const page = await browser.newPage();

const jsRequests = [];
page.on("response", (res) => {
  const url = res.url();
  if (
    url.includes("/node_modules/.pnpm/pg@") ||
    url.includes("/node_modules/.pnpm/postgres") ||
    url.includes("drizzle-orm/node-postgres") ||
    url.includes("@dpmedia")
  ) {
    jsRequests.push(`${res.status()} ${url}`);
  }
});

await page.goto(`${BASE}/exhibitions`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(3000);

// find importers: check the initiator chain is hard; instead grep the transforming module graph
// Just list the offending module URLs
const uniq = [...new Set(jsRequests)];
for (const u of uniq) console.log(u.split("node_modules/").pop().slice(0, 150) ?? u);
console.log(`total pg/db-related requests: ${uniq.length}`);
await browser.close();
