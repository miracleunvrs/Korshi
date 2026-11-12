BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

-- Local synthetic fixtures from seeds/diploma.sql: user 2 is a resident, 3 the chair, 5 the administrator.
INSERT INTO posts(id,author_id,complex_id,type,title,content,territory,status)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffd1','eeeeeeee-eeee-4eee-8eee-000000000002','11111111-1111-1111-1111-111111111111','post','Обычный пост','текст','complex','active');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000002',true);
SELECT throws_ok($$UPDATE posts SET is_official=true WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffd1'$$,'42501',NULL,'Resident cannot mark their post official');
SELECT throws_ok($$UPDATE posts SET type='official_news' WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffd1'$$,'42501',NULL,'Resident cannot turn their post into official news');
SELECT lives_ok($$UPDATE posts SET content='исправленный текст' WHERE id='ffffffff-ffff-4fff-8fff-ffffffffffd1'$$,'Resident still edits their ordinary post');
SELECT throws_ok($$SELECT create_post_bundle('{"type":"official_news","title":"Фейк","content":"Отключение воды","territory":"complex","status":"active"}'::jsonb)$$,'42501',NULL,'Resident cannot publish official news');
SELECT throws_ok($$SELECT create_post_bundle('{"type":"post","title":"Фейк","content":"x","territory":"complex","status":"active","is_official":true}'::jsonb)$$,'42501',NULL,'Resident cannot publish an official post');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000003',true);
SELECT lives_ok($$SELECT create_post_bundle('{"type":"official_news","title":"Отключение воды","content":"Завтра","territory":"complex","status":"active","is_official":true}'::jsonb)$$,'Chair publishes official news');

SELECT set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-000000000005',true);
SELECT lives_ok($$SELECT create_post_bundle('{"type":"fundraiser","title":"Сбор","content":"На лифт","territory":"complex","status":"active","is_official":true}'::jsonb, '[]'::jsonb, NULL, NULL, '{"target_amount":100000}'::jsonb)$$,'Administrator launches a fundraiser');

SELECT * FROM finish();
ROLLBACK;
