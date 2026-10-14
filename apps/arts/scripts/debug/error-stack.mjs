// Capture the full stack of the Buffer error in dev
import { chromium } from "/home/ubuntu/work/clients/deadpartymedia/node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3111";
const browser = await chromium.launch();
const page = await browser.newPage();

page.on("pageerror", (err) => {
  console.log("PAGE ERROR:", err.message);
  console.log("STACK:\n" + err.stack);
});

await page.goto(`${BASE}/exhibitions`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(3000);
await browser.close();
