import { execFileSync, spawn } from 'node:child_process';

// Read only the local CLI instance. Never use .env.local or linked production credentials.
const status = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
if (!['localhost', '127.0.0.1'].includes(new URL(status.API_URL).hostname)) throw new Error('Tests require local Supabase');
const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('Usage: node scripts/with-e2e-env.mjs <command> [args]');
const child = spawn(command, args, {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, NEXT_PUBLIC_DEMO_MODE: 'false',
    NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3100', PLAYWRIGHT_TEST_BASE_URL: 'http://127.0.0.1:3100',
    NEXT_DIST_DIR: '.next-e2e', E2E_LOCAL: 'true', OPENAI_API_KEY: '', OPENAI_MODEL: '' },
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });
