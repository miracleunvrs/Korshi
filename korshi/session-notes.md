# Session Notes — Korshi

Started: 2026-09-11

## Current state
- Working folder created per `methodology/workflow.md`
- Repo on c4d8362 (feat: ship extended Korshi platform), local dev running http://localhost:3000 (PID 5569), Supabase migrations 012-025 applied (fixed 016/017/018 gen_random_bytes -> extensions.gen_random_bytes, reverted push per user request — GitHub at c4d8362, DB at 025)
- Last bug fixed: PostgREST PGRST201 embedding ambiguity in `src/lib/supabase/repository.ts:739,742` (classifieds/house_documents) causing "Не удалось загрузить данные" — fixed with FK hints, verified via test user `playtest@housesm.kz`.

## Next step
- Recon complete per `recon/ROUTER.md` (5-phase pipeline). Endpoints enumerated (39 Next routes + /api/ai + ~80 Supabase tables + 20 RPCs + Realtime) in `recon/endpoints.txt`. Tech stack in `recon/tech-stack.md`, auth in `recon/auth-notes.md`.

## Resume point
- If paused: read this file + `hypothesis-log.md` first (per workflow.md).

RECON COMPLETE: 2026-09-11
Gate: recon complete — domain routers may now be loaded per workflow.md §2.
