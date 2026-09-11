# Auth Notes — Korshi

Accounts:
- admin@housesm.kz (id 61611b5d..., admin, verified, complex 1d3df203..., member is_active)
- miracl3unvrs3@gmail.com / nini (748436f8..., resident, verified)
- ruslan062405@gmail.com (d74f0f10..., created 2026-08-25)
- Test users: playtest@housesm.kz (1d638064..., Test123!, verified, complex 1d3df203, apt 2c1169c3..., membership owner), multiple test-*@test.kz created for hydrate tests

Flows:
- Supabase Auth email+password, email_confirm true for programmatic users, session viaSSR in proxy.ts (middleware -> proxy.ts)
- Profile auto-created via handle_new_user trigger, complex_id null until verification; verification via verification_requests (pending/approved)
- RLS: auth_user_complex_id() = COALESCE(active membership complex_id, profile complex_id); auth_user_verified() checks verified; role hierarchy via complex_memberships (owner/tenant/family/chair/admin/dispatcher...), legacy profile.role mapped
- HydrateDomainData requires currentUserId() -> auth.getUser() -> profileContext (profiles.complex_id/verified) -> 19 parallel selects + messages/comments; RLS denies if not verified or no complex; classifieds/house_documents embedding previously failed without FK hint (now fixed)
- Anonymous (no JWT) gets empty sets (0 rows) not error for simple tables, but currentUserId throws AuthSessionMissingError (400) -> not called when isLoggedIn false (PlatformRuntime/AuthStateSync gate)
