import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { BrowserContext, Page } from "@playwright/test";
import type { Database } from "../../src/types/database.types";

export const complexId = "11111111-1111-1111-1111-111111111111";
export const password = "Korshi-local-2027!"; // Public synthetic fixture, valid only locally.
export function localBackend() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.E2E_LOCAL !== "true" || !url || !anon || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("E2E requires local Supabase. Run pnpm test:e2e.");
  }
  return { url, anon };
}
export function adminClient() {
  const { url } = localBackend();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Local fixture key is missing");
  return createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function authenticate(context: BrowserContext, role = "resident") {
  const { url, anon } = localBackend();
  const values = new Map<string, string>();
  const client = createServerClient<Database>(url, anon, { cookies: {
    getAll: () => [...values].map(([name,value])=>({name,value})),
    setAll: (cookies) => { for (const cookie of cookies) values.set(cookie.name,cookie.value); },
  } });
  const { error } = await client.auth.signInWithPassword({ email: `${role}@korshi.test`, password });
  if (error) throw new Error(`Cannot authenticate local ${role}: ${error.message}`);
  await context.addCookies([...values].map(([name,value])=>({name,value,url:process.env.PLAYWRIGHT_TEST_BASE_URL!,sameSite:"Lax" as const})));
  return client;
}
export async function openProtected(page: Page, route: string) {
  const response = await page.goto(route);
  if (!response?.ok() || new URL(page.url()).pathname !== route) throw new Error(`Protected route ${route} did not open: ${new URL(page.url()).pathname}`);
  await page.locator('#main-content h1').first().waitFor();
}
