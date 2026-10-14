// Debug script: reproduce exhibitions infinite scroll locally
import { chromium } from "/home/ubuntu/work/clients/deadpartymedia/node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3111";

const browser = await chromium.launch();
const page = await browser.newPage();

const consoleErrors = [];
const failedRequests = [];
const serverFnRequests = [];

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
});
page.on("requestfailed", (req) => {
  failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`);
});
page.on("response", (res) => {
  const url = res.url();
  if (url.includes("serverFn") || url.includes("_server")) {
    serverFnRequests.push(`${res.status()} ${res.request().method()} ${url.slice(0, 140)}`);
  }
});

await page.goto(`${BASE}/exhibitions`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(2000);

const countCards = async () => page.locator("article").count();
console.log("cards after load:", await countCards());

// scroll to bottom to trigger infinite scroll
for (let i = 0; i < 5; i++) {
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(1500);
  const c = await countCards();
  console.log(`after scroll ${i + 1}: ${c} cards`);
}

await page.waitForTimeout(3000);
console.log("final cards:", await countCards());
console.log("console errors:", consoleErrors.length ? consoleErrors : "none");
console.log("failed requests:", failedRequests.length ? failedRequests : "none");
console.log("serverFn requests:", serverFnRequests.length ? serverFnRequests : "none");

// check the sentinel text
const sentinelText = await page
  .locator("div.py-8.text-center")
  .first()
  .innerText()
  .catch(() => "n/a");
console.log("sentinel text:", sentinelText.replace(/\n/g, " | "));

await browser.close();
