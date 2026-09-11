import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { authenticate, openProtected } from "./auth";

test.beforeEach(async ({ context }) => { await authenticate(context); });

const routes = [
  "/feed",
  "/requests",
  "/notifications",
  "/documents",
  "/votes",
  "/finance",
  "/emergency",
  "/services",
  "/operations",
  "/community",
  "/classifieds",
  "/ai",
];

test.describe("critical resident routes", () => {
  for (const route of routes) {
    test(`${route} renders without horizontal overflow`, async ({ page }) => {
      await openProtected(page, route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }
});

test("resident can create and revoke a QR pass", async ({ page }) => {
  await openProtected(page, "/operations");
  await page.getByRole("button", { name: "Новый пропуск" }).click();
  const dialog = page.getByRole("dialog");
  const guest = `E2E гость ${crypto.randomUUID().slice(0, 8)}`;
  await dialog.getByLabel("Имя гостя").fill(guest);
  await dialog.getByLabel("Действует до").fill("2030-01-02T12:00");
  await dialog.getByRole("button", { name: "Создать QR-пропуск" }).click();
  await expect(page.getByText("Пропуск создан — QR уже готов")).toBeVisible();
  const card = page.getByRole("article").filter({ hasText: guest });
  await expect(card.getByLabel(`QR-пропуск для ${guest}`)).toBeVisible();
  await page.reload();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Отозвать" }).click();
  await expect(card).toHaveCount(0);
});

test("mobile navigation and request bottom sheet remain usable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only interaction");
  await openProtected(page, "/requests");
  await expect(page.getByRole("navigation").first()).toBeVisible();
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page.getByRole("dialog", { name: "Что случилось?" })).toBeVisible();
  await page.getByRole("button", { name: "Закрыть форму" }).click();
});

for (const route of ["/feed", "/requests", "/operations", "/community"]) {
  test(`accessibility: ${route} has no serious or critical violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openProtected(page, route);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
    expect(blocking, blocking.map((item) => `${item.id}: ${item.help} ${JSON.stringify(item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })))}`).join("\n")).toEqual([]);
  });
}
