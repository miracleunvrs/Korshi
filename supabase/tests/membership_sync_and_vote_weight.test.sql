BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seeds/diploma.sql: user 2 owns apartment 402, user 1 is a tenant.
-- Active membership role is mirrored into the legacy profile role and back.
UPDATE complex_memberships SET role='chair' WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000002' AND is_active;
SELECT is((SELECT role::text FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-000000000002'),'hoa_official','Chair membership grants the legacy official role');
UPDATE complex_memberships SET role='owner' WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000002' AND is_active;
SELECT is((SELECT role::text FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-000000000002'),'resident','Owner membership returns the legacy resident role');
UPDATE profiles SET full_name='Тест resident' WHERE id='eeeeeeee-eeee-4eee-8eee-000000000001';
SELECT is((SELECT role FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001' AND is_active),'tenant','Unrelated profile edits keep the tenant membership');
UPDATE profiles SET role='hoa_official' WHERE id='eeeeeeee-eeee-4eee-8eee-000000000001';
SELECT is((SELECT role FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001' AND is_active),'chair','Legacy role change reaches the active membership');

-- A profile without a membership receives one; an existing one is confirmed.
DELETE FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000006';
SELECT ensure_profile_membership('eeeeeeee-eeee-4eee-8eee-000000000006');
SELECT is((SELECT role || ':' || is_verified || ':' || is_active FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000006'),'owner:true:true','Missing membership is created from the profile');
UPDATE complex_memberships SET is_verified=false WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000006';
SELECT ensure_profile_membership('eeeeeeee-eeee-4eee-8eee-000000000006', true);
SELECT ok((SELECT is_verified FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000006'),'Approval confirms the existing membership');

-- Two co-owners of one apartment vote with their shares.
UPDATE official_votes SET status='active', basis='area' WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff1';
UPDATE apartments SET area_sqm=80 WHERE id='44444444-4444-4444-4444-444444444402';
UPDATE complex_memberships SET ownership_share=0.5 WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000002' AND is_active;
UPDATE complex_memberships SET role='owner', apartment_id='44444444-4444-4444-4444-444444444402', ownership_share=0.5
WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001' AND is_active;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT throws_ok($$SELECT ensure_profile_membership(auth.uid(), true)$$,'42501',NULL,'Users cannot confirm their own membership');
SELECT is((SELECT weight FROM cast_official_vote('ffffffff-ffff-4fff-8fff-fffffffffff1','yes')),40::numeric,'First co-owner votes with half of the area');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT is((SELECT weight FROM cast_official_vote('ffffffff-ffff-4fff-8fff-fffffffffff1','no')),40::numeric,'Second co-owner votes with the other half');
SELECT throws_ok($$SELECT cast_official_vote('ffffffff-ffff-4fff-8fff-fffffffffff1','no')$$,'23505',NULL,'Apartment weight cannot be used twice');
RESET ROLE;
SELECT is((SELECT SUM(weight) FROM official_vote_ballots WHERE vote_id='ffffffff-ffff-4fff-8fff-fffffffffff1'),80::numeric,'Apartment contributes exactly its area');

SELECT * FROM finish();
ROLLBACK;
