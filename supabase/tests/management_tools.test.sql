BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures: complex 1 with tenant 1, owner 2, dispatcher 4.
SET LOCAL ROLE authenticated;

-- A new pass notifies the HOA.
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
INSERT INTO access_passes(guest_name,kind,valid_until) VALUES ('Сестра','single',now()+interval '1 day');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000004',true);
SELECT ok(EXISTS(SELECT 1 FROM notifications WHERE user_id=auth.uid() AND title='Пропуск ждёт одобрения'),'The dispatcher hears about a pending pass');

-- Buildings.
SELECT lives_ok($$SELECT create_building_with_apartments('Сатпаева 2', 2, 3)$$,'The HOA adds a building');
SELECT is((SELECT array_agg(a.number::int ORDER BY a.number::int) FROM apartments a JOIN entrances e ON e.id=a.entrance_id JOIN buildings b ON b.id=e.building_id WHERE b.number='Сатпаева 2'),
  ARRAY[1,2,3,4,5,6],'Apartments are numbered through the entrances');
SELECT is((SELECT e.number FROM apartments a JOIN entrances e ON e.id=a.entrance_id JOIN buildings b ON b.id=e.building_id WHERE b.number='Сатпаева 2' AND a.number='4'),2,
  'Apartment 4 is in the second entrance');
SELECT throws_ok($$SELECT create_building_with_apartments('Сатпаева 2', 1, 1)$$,'23505',NULL,'A building number is unique in the complex');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT throws_ok($$SELECT create_building_with_apartments('Сатпаева 3', 1, 1)$$,'42501',NULL,'A resident cannot add buildings');

-- Group chats.
SELECT set_config('test.chat', create_group_chat('Двор')::text, true);
SELECT is(manage_group_chat(current_setting('test.chat')::uuid,'add',NULL,ARRAY['eeeeeeee-eeee-4eee-8eee-000000000001'::uuid]),'added','The group admin adds a neighbour');
SELECT is(manage_group_chat(current_setting('test.chat')::uuid,'rename','Наш двор'),'renamed','The group admin renames the chat');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT throws_ok($$SELECT manage_group_chat(current_setting('test.chat')::uuid,'rename','Чужой')$$,'42501',NULL,'A member cannot rename the chat');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT is(manage_group_chat(current_setting('test.chat')::uuid,'leave'),'left','The admin leaves');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT is((SELECT role::text FROM chat_members WHERE chat_id=current_setting('test.chat')::uuid),'admin','The remaining member becomes admin');

SELECT * FROM finish();
ROLLBACK;
