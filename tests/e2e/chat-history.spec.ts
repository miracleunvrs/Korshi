import { expect, test } from "@playwright/test";
import { adminClient, authenticate, complexId } from "./auth";

test("long chats show newest messages independently and page backwards after a failed request", async ({ page, context }) => {
  await authenticate(context);
  const admin = adminClient();
  const target = crypto.randomUUID();
  const busy = crypto.randomUUID();
  const user = "eeeeeeee-eeee-4eee-8eee-000000000001";
  const inserted = await admin.from("chats").insert([target, busy].map(id => ({ id, complex_id: complexId, type: "complex", name: `История ${id}` })));
  expect(inserted.error).toBeNull();
  try {
    expect((await admin.from("chat_members").insert([target, busy].map(chat_id => ({ chat_id, user_id: user })))).error).toBeNull();
    // The busy room consumes over 1000 messages; the target uses tied timestamps.
    const rows = [
      ...Array.from({ length: 1100 }, (_, i) => ({ id: crypto.randomUUID(), chat_id: busy, sender_id: user, content: `Busy ${i}`, created_at: '2025-01-01T00:00:00Z' })),
      ...Array.from({ length: 120 }, (_, i) => ({ id: `12345678-1234-4234-8234-${String(i).padStart(12, '0')}`, chat_id: target, sender_id: user, content: `History ${i}`, created_at: '2026-01-01T00:00:00.123456Z' })),
    ];
    // Unique IDs across concurrent desktop/mobile runs, while preserving ordering.
    const prefix = crypto.randomUUID().slice(0, 8);
    for (const row of rows.filter(row => row.chat_id === target)) row.id = prefix + row.id.slice(8);
    for (let offset = 0; offset < rows.length; offset += 500) expect((await admin.from("messages").insert(rows.slice(offset, offset + 500))).error).toBeNull();
    await page.goto(`/chats/${target}`);
    await expect(page.getByText('History 119', { exact: true })).toBeVisible();
    await expect(page.getByText('History 0', { exact: true })).toHaveCount(0);
    let failOlder = true;
    await page.route('**/rest/v1/messages?*', route => {
      if (failOlder && new URL(route.request().url()).searchParams.has('or')) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: '22000', message: 'Synthetic history failure' }) });
      return route.continue();
    });
    const older = page.getByRole('button', { name: 'Более ранние сообщения' });
    await older.click();
    await expect(page.getByText('Не удалось загрузить историю. Попробуйте ещё раз.')).toBeVisible();
    failOlder = false;
    await expect(page.getByText('History 119', { exact: true })).toHaveCount(1);
    await older.click();
    await expect(page.getByText('History 20', { exact: true })).toHaveCount(1);
    await older.click();
    await expect(page.getByText('History 0', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Начало переписки')).toBeVisible();
    await expect(older).toHaveCount(0);
    await expect(page.getByText(/^History \d+$/)).toHaveCount(120);
  } finally {
    expect((await admin.from('chats').delete().in('id', [target, busy])).error).toBeNull();
  }
});
