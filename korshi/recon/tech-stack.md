# Tech Stack — Korshi

Web: Next.js 16.3.4 (Turbopack), React 19, TypeScript 5.9, Tailwind 3.4, Zustand 5, Supabase SSR 0.5.2 + supabase-js 2.114, qrcode, lucide-react, next.config.ts 1416ms
Backend: Supabase Postgres (pgcrypto in extensions schema, uuid-ossp), RLS + RPC (review_verification_request, record_fundraiser_payment, service_request RPCs, cast_official_vote, etc), Storage bucket `house-media` via `uploadWithRetry`, Realtime channels on posts/polls/comments/chats/messages/classifieds/notifications/service_requests/house_documents etc
Mobile: Flutter (mobile/lib/), offline_action_queue, app_router
Infra: pnpm 11.19, Playwright 1.62.1 + @axe-core/playwright, GitHub CI ci.yml, Vercel? (next)
Auth: Supabase Auth email/password, profiles(id, complex_id, verified, role), complex_memberships, RLS via auth_user_complex_id()/auth_user_membership_role()/auth_user_verified()
