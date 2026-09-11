# Hypothesis Log — Korshi

Format: `YYYY-MM-DD | endpoint | vuln_class | status | notes`
Status: TRIED/REFUTED/CONFIRMED/NOT-YET

2026-09-11 | hydrateDomainData (19 parallel selects) | postgrest_embedding_ambiguity | CONFIRMED | classifieds author:profiles + house_documents publisher:profiles ambiguous after 019 (marketplace_favorites) -> PGRST201 -> fix with FK hints in repository.ts:739,742 -> moved to findings/001-postgrest-embedding.md? No — bug, not vuln — logged here, not findings/
2026-09-11 | /api/ai/route.ts | ai-llm-injection | NOT-YET | verify prompt injection / indirect RAG — queued
2026-09-11 | service_requests insert + file upload | idor/rls_bypass | NOT-YET | needs auth matrix — queued
