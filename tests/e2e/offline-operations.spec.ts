import { expect, test } from "@playwright/test";
import { authenticate, openProtected } from "./auth";

/** Local datetime-local value a few days ahead; passes may not exceed one year. */
function soonLocal(days = 7) {
  const date = new Date(Date.now() + days * 86_400_000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

test("offline pass is queued without an active QR", async ({ page, context }) => {
  await authenticate(context);
  await openProtected(page, "/operations");
  await page.getByRole("button", { name: "Новый пропуск" }).click();
  const dialog = page.getByRole("dialog");
  const guest = `Offline ${crypto.randomUUID().slice(0, 8)}`;
  await dialog.getByLabel("Имя гостя").fill(guest);
  await dialog.getByLabel("Действует до").fill(soonLocal());
  await context.setOffline(true);
  await dialog.getByRole("button", { name: "Создать QR-пропуск" }).click();
  await expect(page.getByText("Пропуск в очереди и пока не действует.", { exact: false })).toBeVisible();
  await expect(page.getByLabel(`QR-пропуск для ${guest}`)).toHaveCount(0);
  const queue = await page.evaluate(() => JSON.parse(localStorage.getItem("korshi-platform-sync-queue-v2") || "[]"));
  expect(queue.some((item: { mutation: { table: string } }) => item.mutation.table === "access_passes")).toBe(true);
});

test("offline SOS offers a call without delayed delivery", async ({ page, context }) => {
  await authenticate(context);
  await openProtected(page, "/operations");
  await page.getByRole("button", { name: "Отправить SOS", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('a[href="tel:112"]')).toBeVisible();
  await context.setOffline(true);
  await dialog.getByRole("button", { name: "Отправить SOS", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("SOS не отправлен");
  const queue = await page.evaluate(() => JSON.parse(localStorage.getItem("korshi-platform-sync-queue-v2") || "[]"));
  expect(queue.some((item: { mutation: { table: string } }) => item.mutation.table === "sos_incidents")).toBe(false);
});
