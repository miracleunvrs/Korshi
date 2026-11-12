import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function historyApi() {
  const rows = Array.from({ length: 1350 }, (_, index) => ({ id: String(index).padStart(6, '0'), chat_id: 'room', created_at: '2026-01-01T00:00:00.123456+00:00', sender_id: 'user', content: String(index) }));
  const compiled = ts.transpileModule(readFileSync(new URL('../../src/features/chats/history.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  const client = { from: () => {
    let filtered = rows;
    const orders = [];
    const query = {
      select: () => query,
      eq: (field, value) => { filtered = filtered.filter(row => row[field] === value); return query; },
      or: (filter) => { const id = /id.lt.([^)]*)/.exec(filter)[1]; filtered = filtered.filter(row => row.id < id); return query; },
      order: (field, options) => { orders.push([field, options]); return query; },
      limit: async (size) => {
        assert.deepEqual(orders, [['created_at', { ascending: false }], ['id', { ascending: false }]]);
        return { data: [...filtered].sort((a, b) => b.id.localeCompare(a.id)).slice(0, size) };
      },
    };
    return query;
  } };
  new Function('require', 'exports', compiled)((name) => name.endsWith('/client') ? { createClient: () => client } : { requireBackend: () => true }, loaded.exports);
  return { ...loaded.exports, rows };
}

test('history opens newest page and traverses beyond 1000 tied timestamps without gaps', async () => {
  const api = historyApi();
  let page = await api.loadChatMessages('room', 'user');
  assert.equal(page.length, 50);
  assert.equal(page.at(-1).id, '001349');
  const all = [...page];
  while (page.length) {
    page = await api.loadChatMessages('room', 'user', page[0]);
    all.push(...page);
  }
  assert.equal(all.length, 1350);
  assert.equal(new Set(all.map(row => row.id)).size, 1350);
  assert.deepEqual(await api.loadChatMessages('other-room', 'user'), []);
});

test('new arrivals do not shift the older cursor; merging preserves history and updates', async () => {
  const api = historyApi();
  const latest = await api.loadChatMessages('room', 'user');
  api.rows.push({ ...api.rows[0], id: '999999', content: 'new' });
  const older = await api.loadChatMessages('room', 'user', latest[0]);
  assert.equal(older.at(-1).id, '001299');
  const merged = api.mergeChatMessages([...older, ...latest], [{ ...latest[0], text: 'updated' }]);
  assert.equal(merged.length, 100);
  assert.equal(merged.find(row => row.id === latest[0].id).text, 'updated');
});
