BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures: complex 1 with owner 2, dispatcher 4; user 1 acts as an executor.
INSERT INTO work_orders(id,complex_id,created_by,assigned_to,kind,title,location,starts_at)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffff90','11111111-1111-1111-1111-111111111111','eeeeeeee-eeee-4eee-8eee-000000000004','eeeeeeee-eeee-4eee-8eee-000000000001','repair','Замена лампы','Подъезд 1',now());

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);

-- Passes.
SELECT lives_ok($$INSERT INTO access_passes(id,guest_name,kind,valid_until,access_code,used_count,status)
  VALUES ('ffffffff-ffff-4fff-8fff-ffffffffff93','Гость','single',now()+interval '1 day','MYCODE',-100,'used')$$,'A resident creates a pass');
SELECT is((SELECT used_count FROM access_passes WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff93'),0,'Usage counter starts at zero');
SELECT is((SELECT status FROM access_passes WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff93'),'pending','A resident pass waits for HOA approval');
SELECT isnt((SELECT access_code FROM access_passes WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff93'),'MYCODE','The server issues the access code');
SELECT throws_ok($$INSERT INTO access_passes(guest_name,kind,valid_until) VALUES ('Гость','permanent',now()+interval '5 years')$$,
  '22023',NULL,'A pass cannot be issued for years');
SELECT throws_ok($$UPDATE access_passes SET valid_until = now()+interval '200 days' WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff93'$$,
  '42501',NULL,'A resident cannot extend a pass');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000004',true);
SELECT lives_ok($$UPDATE access_passes SET status='revoked', revoked_at=now() WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff93'$$,'Security revokes the pass');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT throws_ok($$UPDATE access_passes SET status='active' WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff93'$$,
  '42501',NULL,'A resident cannot revive a pass revoked by security');

SELECT lives_ok($$INSERT INTO access_passes(id,guest_name,kind,valid_until) VALUES ('ffffffff-ffff-4fff-8fff-ffffffffff94','Курьер','courier',now()+interval '2 hours')$$,'A second pass');
SELECT lives_ok($$UPDATE access_passes SET status='revoked' WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff94'$$,'A resident revokes their own pass');
SELECT isnt((SELECT revoked_at FROM access_passes WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff94'),NULL,'Revocation time is recorded');

SELECT lives_ok($$INSERT INTO access_passes(id,guest_name,kind,valid_until) VALUES ('ffffffff-ffff-4fff-8fff-ffffffffff95','Мама','single',now()+interval '1 day')$$,'A pass for approval');
SELECT throws_ok($$SELECT review_access_pass('ffffffff-ffff-4fff-8fff-ffffffffff95', true)$$,'42501',NULL,'A resident cannot approve their own pass');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000004',true);
SELECT is(review_access_pass('ffffffff-ffff-4fff-8fff-ffffffffff95', true),'approved','The dispatcher approves the pass');
SELECT is((SELECT status FROM access_passes WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff95'),'active','An approved pass is active');
SELECT is(review_access_pass('ffffffff-ffff-4fff-8fff-ffffffffff95', false),'already_reviewed','A pass is reviewed once');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);

-- Work orders.
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
DELETE FROM work_orders WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff90';
UPDATE work_orders SET assigned_to='eeeeeeee-eeee-4eee-8eee-000000000002' WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff90';
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000004',true);
SELECT is((SELECT assigned_to FROM work_orders WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff90'),'eeeeeeee-eeee-4eee-8eee-000000000001'::uuid,'An executor can neither delete nor reassign a work order');
SELECT lives_ok($$UPDATE work_orders SET status='completed' WHERE id='ffffffff-ffff-4fff-8fff-ffffffffff90'$$,'The dispatcher still manages work orders');

SELECT * FROM finish();
ROLLBACK;
