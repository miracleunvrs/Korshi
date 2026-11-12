import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const routes = ["/feed", "/requests", "/operations"];
const viewports = [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 375, height: 812 }];
const browser = await chromium.launch();
let failed = false;

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`);
    await page.waitForTimeout(50);
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
    console.log(`${violations.length ? "FAIL" : "PASS"} ${viewport.name} ${route}`);
    for (const violation of violations) {
      failed = true;
      console.log(`  ${violation.id}: ${violation.nodes.length} node(s)`);
      for (const node of violation.nodes) console.log(`    ${node.target.join(" ")} :: ${node.html.slice(0, 180)}`);
    }
  }
  await context.close();
}

await browser.close();
if (failed) process.exitCode = 1;
