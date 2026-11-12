BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seeds/diploma.sql: 1 tenant, 2 owner, 3 chair, 4 dispatcher, 5 admin.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000004',true);
UPDATE complex_memberships SET role='admin' WHERE user_id=auth.uid();
SELECT is((SELECT role FROM complex_memberships WHERE user_id=auth.uid() AND is_active),'dispatcher','Dispatcher cannot edit memberships directly');
SELECT throws_ok($$SELECT set_member_role((SELECT id FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001'), 'chair')$$,'42501',NULL,'Dispatcher cannot assign roles');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000003',true);
SELECT throws_ok($$SELECT set_member_role((SELECT id FROM complex_memberships WHERE user_id=auth.uid()), 'admin')$$,'42501',NULL,'Chair cannot change their own role');
SELECT throws_ok($$SELECT set_member_role((SELECT id FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001'), 'admin')$$,'42501',NULL,'Chair cannot grant the administrator role');
SELECT lives_ok($$SELECT set_member_role((SELECT id FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001'), 'executor')$$,'Chair assigns an executor');
SELECT is((SELECT role::text FROM profiles WHERE id='eeeeeeee-eeee-4eee-8eee-000000000001'),'service_provider','Profile role follows the assigned membership role');
SELECT throws_ok($$SELECT set_member_role((SELECT id FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000006'), 'chair')$$,'42501',NULL,'Memberships of another complex are out of reach');

SELECT lives_ok($$SELECT revoke_member_access((SELECT id FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000002'))$$,'Chair revokes access of a resident who moved out');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT is(auth_user_complex_id(),NULL::uuid,'Former resident loses the complex context');
SELECT is((SELECT count(*) FROM chats),0::bigint,'Former resident loses chat access');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000005',true);
SELECT lives_ok($$SELECT set_member_role((SELECT id FROM complex_memberships WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000004'), 'admin')$$,'Administrator can grant the administrator role');

SELECT * FROM finish();
ROLLBACK;
