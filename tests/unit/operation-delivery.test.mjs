import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, mocks, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), compiled)(
    (name) => mocks[name] ?? require(name), loadedModule, loadedModule.exports, ...Object.values(globals),
  );
  return loadedModule.exports;
}
function store(queued) {
  return load('../../src/stores/operationsStore.ts', {
    '@/stores/initialState': { emptyOperationsState: () => ({ passes: [], parkingBookings: [], parkingSpots: [] }) },
    '@/lib/supabase/config': {},
    '@/lib/datetime': load('../../src/lib/datetime.ts', {}),
    '@/lib/appConfig': load('../../src/lib/appConfig.ts', {}),
    '@/lib/supabase/repository': { reviewAccessPass: async () => 'approved' },
    'zustand/middleware': { persist: (initializer) => initializer },
    '@/lib/supabase/platformRepository': { syncPlatformMutation: async () => ({ queued, data: null }) },
    '@/stores/appStore': { useAppStore: { getState: () => ({}) } },
  }).useOperationsStore;
}
for (const queued of [true, false]) {
  test(`pass and parking creation reflect server confirmation (queued=${queued})`, async () => {
    const state = store(queued);
    state.setState({ parkingSpots: [{ id: 'spot', status: 'free' }] });
    await state.getState().createPass({ guestName: 'Гость', kind: 'single', validUntil: '2030-01-01' });
    await state.getState().bookParking('spot', '123ABC', '2030-01-01', '2030-01-02');
    assert.equal(state.getState().passes.length, queued ? 0 : 1);
    assert.equal(state.getState().parkingBookings.length, queued ? 0 : 1);
    assert.equal(state.getState().parkingSpots[0].status, queued ? 'free' : 'reserved');
  });
  test(`revocation and cancellation wait for confirmation (queued=${queued})`, async () => {
    const state = store(queued);
    state.setState({ passes: [{ id: 'pass', status: 'active' }], parkingBookings: [{ id: 'booking', spotId: 'spot', status: 'confirmed' }], parkingSpots: [{ id: 'spot', status: 'reserved' }] });
    await state.getState().revokePass('pass');
    await state.getState().cancelParking('booking');
    assert.equal(state.getState().passes[0].status, queued ? 'active' : 'revoked');
    assert.equal(state.getState().parkingBookings[0].status, queued ? 'confirmed' : 'cancelled');
    assert.equal(state.getState().parkingSpots[0].status, queued ? 'reserved' : 'free');
  });
}
function repository(online, failure) {
  const storage = new Map();
  const calls = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'user' } } } }) },
    rpc: async (name) => {
      calls.push(name);
      if (name === 'auth_user_complex_id') return { data: 'complex' };
      if (failure) throw failure;
      return { data: { id: 'saved' } };
    },
  };
  const api = load('../../src/lib/supabase/platformRepository.ts', {
    '@/lib/supabase/client': { createClient: () => client },
    '@/lib/supabase/config': { requireBackend: () => {} },
    '@/features/sync/queue': load('../../src/features/sync/queue.ts', {}),
  }, {
    navigator: { onLine: online },
    window: { localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) }, dispatchEvent: () => {} },
  });
  return { api, storage, calls };
}
test('offline SOS is rejected without queueing or contacting the server', async () => {
  const { api, storage, calls } = repository(false);
  await assert.rejects(api.syncPlatformMutation({ operation: 'insert', table: 'sos_incidents', payload: {} }), /112/);
  assert.equal(storage.size, 0);
  assert.deepEqual(calls, []);
});
test('lost SOS response is not scheduled for delayed delivery', async () => {
  const { api, storage } = repository(true, new TypeError('Failed to fetch'));
  await assert.rejects(api.syncPlatformMutation({ operation: 'insert', table: 'sos_incidents', payload: {} }), /112/);
  assert.equal(storage.size, 0);
});
test('switching complex quarantines stale actions instead of running them', async () => {
  const { api, storage } = repository(true);
  await api.syncPlatformMutation({ operation: 'insert', table: 'access_passes', payload: {} });
  const key = 'korshi-platform-sync-queue-v2';
  const base = { userId: 'user', attempts: 0, status: 'pending', nextAttemptAt: 0, mutation: { operation: 'insert', table: 'access_passes' } };
  storage.set(key, JSON.stringify([
    { ...base, id: 'stale', complexId: 'old-complex' },
    { ...base, id: 'current', complexId: 'complex' },
    { ...base, id: 'foreign', userId: 'someone-else', complexId: 'old-complex' },
    { ...base, id: 'already-blocked', complexId: 'old-complex', status: 'blocked', error: 'Ранее отклонено' },
  ]));
  assert.equal(api.quarantineStaleScopeActions(), 1);
  const remaining = JSON.parse(storage.get(key));
  assert.equal(remaining.find((item) => item.id === 'stale').status, 'blocked');
  assert.match(remaining.find((item) => item.id === 'stale').error, /ЖК/);
  assert.equal(remaining.find((item) => item.id === 'current').status, 'pending');
  assert.equal(remaining.find((item) => item.id === 'foreign').status, 'pending');
  assert.equal(remaining.find((item) => item.id === 'already-blocked').error, 'Ранее отклонено');
});
test('quarantine without an established scope changes nothing', async () => {
  const { api, storage } = repository(true);
  assert.equal(api.quarantineStaleScopeActions(), 0);
  assert.equal(storage.size, 0);
});
function switchingStore(queued, hooks) {
  return load('../../src/stores/operationsStore.ts', {
    '@/stores/initialState': { emptyOperationsState: () => ({ memberships: [{ id: 'a', isActive: true }, { id: 'b', isActive: false }], syncMessage: '' }) },
    '@/lib/supabase/config': {},
    '@/lib/datetime': load('../../src/lib/datetime.ts', {}),
    '@/lib/appConfig': load('../../src/lib/appConfig.ts', {}),
    '@/lib/supabase/repository': { reviewAccessPass: async () => 'approved' },
    'zustand/middleware': { persist: (initializer) => initializer },
    '@/lib/supabase/platformRepository': {
      syncPlatformMutation: async () => { hooks.mutated++; return { queued, data: null }; },
      loadPlatformSnapshot: async () => { hooks.snapshot++; return null; },
      clearPlatformScope: () => { hooks.scopeCleared++; },
      quarantineStaleScopeActions: () => { hooks.quarantined++; return 0; },
    },
    '@/stores/appStore': { useAppStore: { getState: () => ({ syncAuthState: async () => { hooks.profile++; }, hydrateDomainData: async () => { hooks.domain++; } }) } },
  }).useOperationsStore;
}
test('delivered switch refreshes scope, profile and data consistently', async () => {
  const hooks = { mutated: 0, scopeCleared: 0, snapshot: 0, quarantined: 0, profile: 0, domain: 0 };
  const state = switchingStore(false, hooks);
  await state.getState().switchMembership('b');
  const memberships = state.getState().memberships;
  assert.equal(memberships.find((m) => m.id === 'b').isActive, true);
  assert.equal(memberships.find((m) => m.id === 'a').isActive, false);
  assert.deepEqual(hooks, { mutated: 1, scopeCleared: 1, snapshot: 1, quarantined: 1, profile: 1, domain: 1 });
  assert.equal(state.getState().syncMessage, 'Активный объект изменён');
});
test('queued switch defers the refresh until the server confirms', async () => {
  const hooks = { mutated: 0, scopeCleared: 0, snapshot: 0, quarantined: 0, profile: 0, domain: 0 };
  const state = switchingStore(true, hooks);
  await state.getState().switchMembership('b');
  assert.equal(state.getState().memberships.find((m) => m.id === 'b').isActive, true);
  assert.deepEqual(hooks, { mutated: 1, scopeCleared: 0, snapshot: 0, quarantined: 0, profile: 0, domain: 0 });
  assert.match(state.getState().syncMessage, /синхронизации/);
});
test('legacy SOS in the queue is blocked, while ordinary actions still sync', async () => {
  const { api, storage, calls } = repository(true);
  await api.syncPlatformMutation({ operation: 'insert', table: 'access_passes', payload: {} });
  calls.length = 0;
  const key = 'korshi-platform-sync-queue-v2';
  const item = { id: 'old', userId: 'user', complexId: 'complex', attempts: 0, status: 'pending', nextAttemptAt: 0, mutation: { operation: 'insert', table: 'sos_incidents' } };
  storage.set(key, JSON.stringify([item, { ...item, id: 'ordinary', mutation: { operation: 'insert', table: 'access_passes' } }]));
  await api.flushPlatformQueue();
  assert.equal(calls.length, 1);
  const remaining = JSON.parse(storage.get(key));
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].status, 'blocked');
  assert.match(remaining[0].error, /112/);
});
