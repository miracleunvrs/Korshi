import { expect, test } from "@playwright/test";
import { adminClient, authenticate, complexId, openProtected } from "./auth";

test("only completed work can be rated; own updated rating survives reload", async ({ page, context }) => {
  const resident = await authenticate(context);
  const admin = adminClient();
  const completedId = crypto.randomUUID();
  const plannedId = crypto.randomUUID();
  const completedTitle = `Завершённая работа ${completedId.slice(0, 8)}`;
  const plannedTitle = `Запланированная работа ${plannedId.slice(0, 8)}`;
  const residentId = "eeeeeeee-eeee-4eee-8eee-000000000001";
  const fixture = {
    complex_id: complexId, created_by: residentId, kind: "cleaning",
    location: "Дом 1", starts_at: new Date().toISOString(),
  };
  const inserted = await admin.from("work_orders").insert([
    { ...fixture, id: completedId, title: completedTitle, status: "completed" },
    { ...fixture, id: plannedId, title: plannedTitle, status: "planned" },
  ]);
  expect(inserted.error).toBeNull();
  try {
    // Another resident's rating must not be shown as the current user's rating.
    const ratings = await admin.from("work_ratings").insert([
      { work_order_id: completedId, user_id: "eeeeeeee-eeee-4eee-8eee-000000000002", rating: 2 },
      { work_order_id: completedId, user_id: residentId, rating: 4 },
    ]);
    expect(ratings.error).toBeNull();
    await openProtected(page, "/operations");
    await page.getByRole("tab", { name: "Работы", exact: true }).click();
    const completed = page.getByRole("article").filter({ hasText: completedTitle });
    const planned = page.getByRole("article").filter({ hasText: plannedTitle });
    await expect(completed.getByText("Завершено", { exact: true })).toBeVisible();
    await expect(completed.getByRole("button", { name: "Оценить на 4", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(completed.getByRole("button", { name: "Оценить на 2", exact: true })).toHaveAttribute("aria-pressed", "false");
    for (const rating of [1, 2, 3, 4, 5]) {
      await expect(planned.getByRole("button", { name: `Оценить на ${rating}`, exact: true })).toBeDisabled();
    }
    await completed.getByRole("button", { name: "Оценить на 5", exact: true }).click();
    await expect(completed.getByRole("button", { name: "Оценить на 5", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await page.getByRole("tab", { name: "Работы", exact: true }).click();
    await expect(completed.getByRole("button", { name: "Оценить на 5", exact: true })).toHaveAttribute("aria-pressed", "true");
    const saved = await resident.from("work_ratings").select("rating").eq("work_order_id", completedId).eq("user_id", residentId).single();
    expect(saved.error).toBeNull();
    expect(saved.data?.rating).toBe(5);
  } finally {
    await admin.from("work_orders").delete().in("id", [completedId, plannedId]);
  }
});
