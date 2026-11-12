BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seed.sql and seeds/diploma.sql: 2 owner, 3 chair.
INSERT INTO auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data) VALUES
  ('eeeeeeee-eeee-4eee-8eee-0000000000d1','authenticated','authenticated','invited@korshi.test',now(),'{"full_name":"Приглашённый"}'),
  ('eeeeeeee-eeee-4eee-8eee-0000000000d2','authenticated','authenticated','late@korshi.test',now(),'{"full_name":"Опоздавший"}');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT throws_ok($$SELECT create_official_vote('Ремонт крыши','Утвердить смету ремонта крыши','owner',51,now(),now()+interval '7 days')$$,'42501',NULL,'Residents cannot create votes');
SELECT throws_ok($$SELECT create_apartment_invite('44444444-4444-4444-4444-444444444406')$$,'42501',NULL,'Residents cannot issue invites');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000003',true);
SELECT throws_ok($$SELECT create_official_vote('Ремонт крыши','Утвердить смету ремонта крыши','area',51,now(),now()+interval '7 days')$$,'P0001',NULL,'Area vote needs apartment areas');
SELECT is((SELECT status::text FROM create_official_vote('Ремонт крыши','Утвердить смету ремонта крыши','owner',51,now(),now()+interval '7 days')),'active','Chair opens an owner vote');
SELECT ok((SELECT eligible_units FROM official_votes WHERE title='Ремонт крыши') >= 6,'Eligible apartments are counted from the complex');
SELECT throws_ok($$SELECT create_apartment_invite('dddddddd-dddd-4ddd-8ddd-dddddddddddd')$$,'42501',NULL,'Apartments of another complex are out of reach');
SELECT is((SELECT char_length(code) FROM create_apartment_invite('44444444-4444-4444-4444-444444444406')),10,'Chair issues a ten-character invite');
RESET ROLE;
SELECT is((SELECT count(*) FROM notifications WHERE type='vote' AND user_id='eeeeeeee-eeee-4eee-8eee-000000000002'),1::bigint,'Residents are told about the vote');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-0000000000d1',true);
SELECT is((SELECT count(*) FROM apartment_invites),0::bigint,'Invite codes are hidden from residents');
SELECT is(redeem_apartment_invite('WRONGCODE1'),'invalid','Unknown code is rejected');
RESET ROLE;
-- Codes are read as the database owner here; the resident only types them in.
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-0000000000d1',true);
SELECT is(redeem_apartment_invite((SELECT lower(code) FROM apartment_invites LIMIT 1)),'ok','Resident redeems the invite (case-insensitive)');
SELECT is((SELECT apartment_id::text || ':' || verified FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-0000000000d1'),'44444444-4444-4444-4444-444444444406:true','Invite verifies the resident in that apartment');
SELECT is((SELECT role || ':' || is_verified FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-0000000000d1'),'owner:true','Invite creates a verified membership');
SELECT ok((SELECT count(*) FROM chat_members WHERE user_id='eeeeeeee-eeee-4eee-8eee-0000000000d1') > 0,'Invited resident joins the chats');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-0000000000d2',true);
SELECT is(redeem_apartment_invite((SELECT code FROM apartment_invites LIMIT 1)),'used','A code works only once');
SELECT is(redeem_apartment_invite('AAAAAAAAA1'),'invalid','Second wrong attempt');
SELECT is(redeem_apartment_invite('AAAAAAAAA2'),'invalid','Third wrong attempt');
SELECT is(redeem_apartment_invite('AAAAAAAAA3'),'invalid','Fourth wrong attempt');
SELECT is(redeem_apartment_invite('AAAAAAAAA4'),'invalid','Fifth attempt is still allowed');
SELECT is(redeem_apartment_invite('AAAAAAAAA5'),'rate_limited','Sixth attempt within an hour is blocked');

SELECT * FROM finish();
ROLLBACK;
