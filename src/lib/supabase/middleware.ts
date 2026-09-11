import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (isDemoMode()) return supabaseResponse;
  if (!isSupabaseConfigured()) {
    if (!["/", "/login"].includes(request.nextUrl.pathname) && !request.nextUrl.pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/login?error=configuration", request.url));
    }
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const isAuthRoute = pathname.startsWith("/auth") || pathname === "/login";
    const isPublicRoute = pathname === "/";

    if (!user && !isAuthRoute && !isPublicRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isAuthRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/feed";
      return NextResponse.redirect(redirectUrl);
    }
  } catch (err) {
    console.warn("Supabase auth session check failed:", err);

    const { pathname } = request.nextUrl;
    const isAuthRoute = pathname.startsWith("/auth") || pathname === "/login";
    if (!isAuthRoute && pathname !== "/") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "session_check_failed");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
