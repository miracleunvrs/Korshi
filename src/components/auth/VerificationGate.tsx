"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Pages an unverified resident needs to finish verification.
const OPEN_PATHS = ["/profile", "/verify-resident", "/notifications"];

/**
 * Until residence is confirmed the server returns no community data, so the
 * other sections would only show empty screens. Explain why instead.
 */
export default function VerificationGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoggedIn = useAppStore((state) => state.isLoggedIn);
  const isAuthLoading = useAppStore((state) => state.isAuthLoading);
  const verified = useAppStore((state) => state.currentUser.verified);

  if (!isSupabaseConfigured() || !isLoggedIn || isAuthLoading || verified) return <>{children}</>;
  if (OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return <>{children}</>;

  return (
    <section className="grid min-h-[70vh] place-items-center px-6 py-12 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-green-50 text-green-700">
          <ShieldCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-xl font-black text-stone-950">Подтвердите проживание</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Лента, чаты и данные дома открываются после подтверждения, что вы живёте в доме. Введите код от ОСИ — доступ
          откроется сразу — или отправьте документы на проверку управлению ЖК.
        </p>
        <Link href="/verify-resident" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-green-800 px-5 text-sm font-extrabold text-white hover:bg-green-900">
          Подтвердить проживание
        </Link>
      </div>
    </section>
  );
}
