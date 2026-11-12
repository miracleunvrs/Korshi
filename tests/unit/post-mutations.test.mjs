import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../src/stores/appStore.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadStore(repository, role = 'hoa_official') {
  const storeModule = { exports: {} };
  const mocks = {
    '@/demo/initialState': { appFixturesInitial: () => ({
      posts: [], currentUser: { id: 'user', role, verified: true },
    }) },
    '@/demo/accounts': { DEFAULT_ACCOUNTS: [] },
    '@/lib/supabase/client': {},
    '@/lib/supabase/config': { isSupabaseConfigured: () => true, isDemoMode: () => false },
    '@/lib/appConfig': { complexName: (value) => value || 'Солнечный' },
    '@/features/chats/history': { mergeChatMessages: (older, latest) => [...older, ...latest] },
    '@/lib/supabase/repository': repository,
    // Persistence is unrelated to the mutation contract under test.
    'zustand/middleware': { persist: (initializer) => initializer },
  };
  new Function('require', 'module', 'exports', compiled)(
    (name) => mocks[name] ?? require(name), storeModule, storeModule.exports,
  );
  return storeModule.exports.useAppStore;
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const fundraiser = { title: 'Освещение', content: 'Новые светильники', targetAmount: 1000 };

test('failed post creation removes only that post, preserving concurrent updates', async () => {
  const request = deferred();
  const firstId = '11111111-1111-4111-8111-111111111111';
  const secondId = '22222222-2222-4222-8222-222222222222';
  const store = loadStore({ persistPost: (post) => post.id === firstId ? request.promise : Promise.resolve() });
  store.setState({ posts: [{ id: 'existing', reactions_count: 0 }] });
  store.getState().addPost({ id: firstId });
  store.getState().addPost({ id: secondId });
  store.setState((state) => ({ posts: state.posts.map((post) => post.id === 'existing' ? { ...post, reactions_count: 1 } : post) }));

  request.reject(new Error('Нет связи'));
  await request.promise.catch(() => undefined);
  assert.deepEqual(store.getState().posts, [{ id: secondId }, { id: 'existing', reactions_count: 1 }]);
  assert.equal(store.getState().backendError, 'Нет связи');
});

test('fundraiser success awaits persistence and keeps concurrent feed updates', async () => {
  const request = deferred();
  let savedPost;
  const store = loadStore({ persistFundraiser: (post) => { savedPost = post; return request.promise; } });
  const completion = store.getState().createFundraiser(fundraiser);
  assert.equal(typeof completion?.then, 'function');
  assert.deepEqual(store.getState().posts, []);
  // A realtime refresh can arrive before the RPC response.
  store.setState({ posts: [savedPost, { id: 'concurrent' }] });
  request.resolve(savedPost.id);
  await completion;
  assert.deepEqual(store.getState().posts.map((post) => post.id), [savedPost.id, 'concurrent']);
});

test('rejected fundraiser reports failure without leaving a phantom post', async () => {
  const failure = new Error('Недостаточно прав');
  const store = loadStore({ persistFundraiser: async () => { throw failure; } });
  await assert.rejects(async () => store.getState().createFundraiser(fundraiser), failure);
  assert.deepEqual(store.getState().posts, []);
  assert.equal(store.getState().backendError, failure.message);
});

test('unauthorized fundraiser creation rejects instead of reporting success', async () => {
  let called = false;
  const store = loadStore({ persistFundraiser: async () => { called = true; } }, 'resident');
  await assert.rejects(async () => store.getState().createFundraiser(fundraiser), /Только представитель ОСИ/);
  assert.equal(called, false);
  assert.deepEqual(store.getState().posts, []);
});
