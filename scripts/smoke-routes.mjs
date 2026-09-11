import { createServerClient } from '@supabase/ssr';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baseUrl = (process.env.SMOKE_BASE_URL || process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (process.env.E2E_LOCAL !== 'true' || !url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Smoke tests require local seeded Supabase');
const cookies = new Map();
const auth = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: {
  getAll: () => [...cookies].map(([name,value])=>({name,value})),
  setAll: (items) => { for (const item of items) cookies.set(item.name,item.value); },
} });
const login = await auth.auth.signInWithPassword({email:'resident@korshi.test',password:'Korshi-local-2027!'});
if (login.error) throw new Error(`Local smoke login failed: ${login.error.message}`);
const cookieHeader = [...cookies].map(([name,value])=>`${name}=${value}`).join('; ');
const routes = ['/feed','/requests','/notifications','/documents','/votes','/finance','/emergency','/services','/operations','/community','/classifieds','/ai','/sync'];

async function reachable() {
  try { return (await fetch(`${baseUrl}/login`)).ok; } catch { return false; }
}

let server;
if (!(await reachable())) {
  const target = new URL(baseUrl);
  if (!['127.0.0.1', 'localhost'].includes(target.hostname)) throw new Error(`Smoke server is unavailable: ${baseUrl}`);
  const nextBin = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
  server = spawn(process.execPath, [nextBin, 'start', '--hostname', target.hostname, '--port', target.port || '3100'], {
    env: process.env,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  const deadline = Date.now() + 60_000;
  while (!(await reachable())) {
    if (server.exitCode !== null) throw new Error(`Smoke server exited with code ${server.exitCode}`);
    if (Date.now() >= deadline) throw new Error('Smoke server did not become ready in 60 seconds');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

let failed=false;
try {
  for (const route of routes) {
    try {
      const response = await fetch(baseUrl + route, { redirect: 'manual', headers: { Cookie: cookieHeader } });
      const html = await response.text();
      const passed = response.status === 200 && html.includes('id="main-content"');
      console.log(`${passed?'PASS':'FAIL'} ${response.status} ${route}`);
      failed ||= !passed;
    } catch { console.error(`FAIL network ${route}`); failed=true; }
  }
} finally {
  server?.kill('SIGTERM');
}
process.exitCode=failed?1:0;
