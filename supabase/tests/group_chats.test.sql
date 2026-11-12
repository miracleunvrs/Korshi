BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures: owner 2 and tenant 1 are verified residents of complex 1.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);

SELECT lives_ok($$SELECT create_group_chat('Родители двора')$$,'A resident creates a group with nobody else in it');
SELECT is((SELECT count(*)::int FROM chat_members m JOIN chats c ON c.id=m.chat_id WHERE c.name='Родители двора'),1,
  'The creator is the only member');
SELECT is((SELECT m.role::text FROM chat_members m JOIN chats c ON c.id=m.chat_id WHERE c.name='Родители двора'),'admin',
  'The creator administers the group');

SELECT lives_ok($$SELECT create_group_chat('Велосипедисты', ARRAY['eeeeeeee-eeee-4eee-8eee-000000000001'::uuid, gen_random_uuid()])$$,
  'Unknown people in the list are skipped');
SELECT is((SELECT count(*)::int FROM chat_members m JOIN chats c ON c.id=m.chat_id WHERE c.name='Велосипедисты'),2,
  'Only the neighbour from the same complex is added');

SELECT throws_ok($$SELECT create_group_chat(' ')$$,'22023',NULL,'A group needs a name');

SELECT * FROM finish();
ROLLBACK;
