# Scope — Korshi (HouseSM)

Target: Korshi — закрытая цифровая среда ЖК (Next.js Web + Flutter Mobile + Supabase)
Repo: https://github.com/miracleunvrs/korshi (local at /Users/ruslan/orca/projects/housesm, branch main)
Environments:
- Local Web: http://localhost:3000 (Next.js 16.3.4, Turbopack)
- Supabase project: yqnseydetzddhgrpjdxw (HouseSM, Northeast Asia Tokyo), linked via `supabase/.temp/linked-project.json`
- Storage bucket: house-media

## In scope (authorized)
- This local checkout and linked Supabase project (you own/control it)
- All first-party routes under http://localhost:3000 (Web) and Dart code under `mobile/`
- Supabase Postgres (public schema), Edge? (none), Storage
- Supabase Auth (email/password, RLS/RPC)

## Out of scope
- External dependencies not in this repo (e.g., real payment/SMS/SCUD providers — stubbed in 012-025)
- Third-party playground attacks (DoS, spam) — keep testing non-destructive
- Other tenants/projects outside yqnseydetzddhgrpjdxw

## Rules
- Non-destructive only; do not delete/modify prod data beyond test accounts (e.g., `playtest@housesm.kz`)
- Document every hypothesis in `hypothesis-log.md` before exploitation
- Findings only confirmed after reproducibility -> `findings/`
- Recon gate: do not exploit until `RECON COMPLETE` line in `session-notes.md`

Source: AGENTS.md, README.md, docs/, .env.local
