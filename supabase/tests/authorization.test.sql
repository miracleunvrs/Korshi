BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seeds/diploma.sql.
INSERT INTO service_requests(id,created_by,complex_id,category,title,description,location)
VALUES ('ffffffff-ffff-4fff-8fff-fffffffffff3','eeeeeeee-eeee-4eee-8eee-000000000001','11111111-1111-1111-1111-111111111111','repair','Тестовая заявка','Не работает освещение на лестнице','Дом 1');
UPDATE official_votes SET status='active' WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff1';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000006',true);
SELECT is((SELECT count(*) FROM service_requests WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff3'),0::bigint,'Other complex cannot read private request');
SELECT is((SELECT count(*) FROM official_votes WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff1'),0::bigint,'Other complex cannot read vote');
SELECT throws_ok($$SELECT add_service_request_comment('ffffffff-ffff-4fff-8fff-fffffffffff3','Чужой комментарий')$$,'P0001',NULL,'Other complex cannot comment');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT is((SELECT count(*) FROM service_requests WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff3'),1::bigint,'Resident can read own request');
SELECT throws_ok($$UPDATE profiles SET role='admin' WHERE id=auth.uid()$$,'42501',NULL,'Resident cannot promote profile');
SELECT throws_ok($$SELECT update_service_request_status('ffffffff-ffff-4fff-8fff-fffffffffff3','resolved')$$,'P0001',NULL,'Resident cannot resolve their own request');
SELECT throws_ok($$SELECT cast_official_vote('ffffffff-ffff-4fff-8fff-fffffffffff1','yes')$$,'P0001',NULL,'Tenant cannot cast owner vote');
INSERT INTO ai_jobs(id,feature,input_hash,status)
VALUES ('ffffffff-ffff-4fff-8fff-fffffffffff8','request_triage','synthetic-hash','running');
SELECT lives_ok($$SELECT complete_ai_job('ffffffff-ffff-4fff-8fff-fffffffffff8','local-response','{"category":"repair"}',true)$$,'User completes own AI audit job');
SELECT is((SELECT status FROM ai_jobs WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff8'),'completed','Completed AI result is retained');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000004',true);
SELECT is((SELECT count(*) FROM service_requests WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff3'),1::bigint,'Dispatcher can read request');
SELECT lives_ok($$SELECT update_service_request_status('ffffffff-ffff-4fff-8fff-fffffffffff3','in_progress',p_assignee_name=>'Тестовый исполнитель')$$,'Dispatcher accepts request');
SELECT lives_ok($$SELECT update_service_request_status('ffffffff-ffff-4fff-8fff-fffffffffff3','resolved',p_note=>'Работа выполнена')$$,'Dispatcher resolves request');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
SELECT lives_ok($$SELECT rate_service_request('ffffffff-ffff-4fff-8fff-fffffffffff3',5::smallint)$$,'Resident rates completed request');
SELECT ok(EXISTS(SELECT 1 FROM notifications WHERE user_id=auth.uid() AND data->>'service_request_id'='ffffffff-ffff-4fff-8fff-fffffffffff3'),'Resident receives status notification');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT lives_ok($$SELECT cast_official_vote('ffffffff-ffff-4fff-8fff-fffffffffff1','yes')$$,'Owner can vote');
SELECT throws_ok($$SELECT cast_official_vote('ffffffff-ffff-4fff-8fff-fffffffffff1','no')$$,'23505',NULL,'Second ballot is rejected');
UPDATE official_vote_ballots SET choice='no' WHERE voter_id=auth.uid();
SELECT is((SELECT choice::text FROM official_vote_ballots WHERE voter_id=auth.uid()),'yes','Ballot cannot be changed');
DELETE FROM official_vote_ballots WHERE voter_id=auth.uid();
SELECT is((SELECT count(*) FROM official_vote_ballots WHERE voter_id=auth.uid()),1::bigint,'Ballot cannot be deleted');
SELECT lives_ok($$SELECT create_amenity_booking('ffffffff-ffff-4fff-8fff-fffffffffff2',now()+interval '1 day',now()+interval '1 day 1 hour')$$,'First booking succeeds');
SELECT throws_ok($$SELECT create_amenity_booking('ffffffff-ffff-4fff-8fff-fffffffffff2',now()+interval '1 day 30 minutes',now()+interval '1 day 90 minutes')$$,'P0001',NULL,'Overlapping booking rejected');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000005',true);
SELECT is((SELECT count(*) FROM service_requests WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff3'),1::bigint,'Admin can read same-complex request');
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000001',true);
UPDATE complex_memberships SET role='admin' WHERE user_id=auth.uid();
SELECT is((SELECT role FROM complex_memberships WHERE user_id=auth.uid() AND is_active),'tenant','Resident cannot promote membership');
SELECT * FROM finish();
ROLLBACK;
