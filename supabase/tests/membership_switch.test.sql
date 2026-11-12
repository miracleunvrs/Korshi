BEGIN;
SELECT no_plan();
INSERT INTO complex_memberships(id,user_id,complex_id,apartment_id,role,is_verified,is_active)
VALUES('ffffffff-ffff-4fff-8fff-ffffffffff50','eeeeeeee-eeee-4eee-8eee-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd','tenant',true,false);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT is((SELECT complex_id FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-000000000001'),'11111111-1111-1111-1111-111111111111'::uuid,'Profile starts in the first complex');
SELECT lives_ok($$SELECT switch_active_membership('ffffffff-ffff-4fff-8fff-ffffffffff50')$$,'Switch to the second membership succeeds');
SELECT is((SELECT complex_id FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-000000000001'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'Profile follows the active membership');
SELECT is((SELECT apartment_id FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-000000000001'),'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,'Profile apartment follows the active membership');
SELECT is(auth_user_complex_id(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'Active complex context follows the switch');
SELECT is((SELECT count(*) FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001' AND is_active),1::bigint,'Exactly one membership stays active');
SELECT throws_ok($$SELECT switch_active_membership('ffffffff-ffff-4fff-8fff-ffffffffff51')$$,NULL,NULL,'Unknown membership cannot be activated');
SELECT * FROM finish();
ROLLBACK;
