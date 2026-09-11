const PLACEHOLDER_PATTERN = /placeholder|your-project|your[_-]|<[^>]+>/i;

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function requireBackend() {
  if (isDemoMode()) return false;
  if (!isSupabaseConfigured()) throw new Error("Supabase не настроен. Демо-режим выключен.");
  return true;
}

export function isSupabaseConfigured() {
  if (isDemoMode()) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || PLACEHOLDER_PATTERN.test(url) || PLACEHOLDER_PATTERN.test(anonKey)) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const localHttp = parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsedUrl.hostname);
    return (parsedUrl.protocol === "https:" || localHttp) && anonKey.length > 20;
  } catch {
    return false;
  }
}

export function getAuthCallbackUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (configuredUrl && !PLACEHOLDER_PATTERN.test(configuredUrl)) {
    return `${configuredUrl}/auth/callback`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  return "/auth/callback";
}
