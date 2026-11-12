BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seeds/diploma.sql: 1 tenant, 2 owner, 3 chair, 4 dispatcher, 5 admin.
INSERT INTO access_passes(id,complex_id,resident_id,guest_name,kind,valid_from,valid_until)
VALUES ('ffffffff-ffff-4fff-8fff-fffffffffff9','11111111-1111-1111-1111-111111111111','eeeeeeee-eeee-4eee-8eee-000000000002','Гость','single',now() - interval '2 days',now() - interval '1 day');
SELECT is(expire_access_passes(),1,'Expired pass is found');
SELECT is((SELECT status FROM access_passes WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff9'),'expired','Pass past its deadline becomes expired');

UPDATE official_votes SET status='active', ends_at=now() - interval '1 minute' WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff1';
SELECT ok(close_expired_official_votes() >= 1,'Finished vote is closed');
SELECT is((SELECT status::text FROM official_votes WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff1'),'completed','Vote past its deadline is completed');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000003',true);
INSERT INTO notification_broadcasts(title,body,channels) VALUES ('Сообщение ОСИ','Завтра отключат воду',ARRAY['in_app']);
RESET ROLE;
SELECT is((SELECT status FROM notification_broadcasts WHERE body='Завтра отключат воду'),'sent','Broadcast is marked delivered');
SELECT is((SELECT count(*) FROM notifications WHERE type='broadcast' AND user_id='eeeeeeee-eeee-4eee-8eee-000000000001'),1::bigint,'Residents receive the broadcast');
SELECT is((SELECT count(*) FROM notifications WHERE type='broadcast' AND user_id='eeeeeeee-eeee-4eee-8eee-000000000006'),0::bigint,'Residents of another complex do not');

INSERT INTO service_requests(id,created_by,complex_id,category,title,description,location)
VALUES ('ffffffff-ffff-4fff-8fff-fffffffffffa','eeeeeeee-eeee-4eee-8eee-000000000002','11111111-1111-1111-1111-111111111111','repair','Течёт кран','Вода течёт из крана в подвале','Дом 1');
SELECT is((SELECT count(*) FROM notifications WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000004' AND data->>'service_request_id'='ffffffff-ffff-4fff-8fff-fffffffffffa'),1::bigint,'Dispatcher hears about a new request');

UPDATE complex_memberships SET role='executor' WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000004',true);
SELECT lives_ok($$SELECT update_service_request_status('ffffffff-ffff-4fff-8fff-fffffffffffa','in_progress',p_assignee_id=>'eeeeeeee-eeee-4eee-8eee-000000000001',p_assignee_name=>'Тест resident')$$,'Dispatcher assigns an executor');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT is((SELECT count(*) FROM service_requests WHERE id='ffffffff-ffff-4fff-8fff-fffffffffffa'),1::bigint,'Executor sees the assigned private request');
RESET ROLE;
SELECT is((SELECT count(*) FROM notifications WHERE user_id='eeeeeeee-eeee-4eee-8eee-000000000001' AND title='Вам назначена заявка'),1::bigint,'Executor is notified about the assignment');

SELECT * FROM finish();
ROLLBACK;
