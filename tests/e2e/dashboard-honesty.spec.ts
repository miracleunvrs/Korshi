import { expect, test } from "@playwright/test";
import { authenticate, openProtected } from "./auth";

test("financial pages do not invent payments, debts or contribution history", async ({ page, context }) => {
  await authenticate(context);
  await openProtected(page, "/finance");
  const main = page.locator("#main-content");
  await expect(main.getByText("Отсутствие данных не означает отсутствие задолженности.", { exact: false })).toBeVisible();
  await expect(main.getByText("Оплачено 2 сентября", { exact: false })).toHaveCount(0);
  await expect(main.getByRole("button", { name: "Открыть квитанцию" })).toHaveCount(0);
  await openProtected(page, "/profile");
  await expect(main.getByText("100%", { exact: true })).toHaveCount(0);
  await expect(main.getByText("5 000 ₸", { exact: true })).toHaveCount(0);
  await main.getByRole("button", { name: "История взносов" }).click();
  await expect(main.getByText("История личных взносов пока не подключена.", { exact: false })).toBeVisible();
});

test("home widgets do not fabricate voting and emergency status", async ({ page, context }) => {
  await authenticate(context);
  await openProtected(page, "/feed");
  await expect(page.getByText("Управление на связи", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Сегодня спокойно", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Голос уже отдали 68 жителей.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("открытых голосований", { exact: true })).toBeVisible();
  await expect(page.locator('a[href="tel:+77771234567"]')).toHaveCount(0);
});
